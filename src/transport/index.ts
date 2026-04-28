import { execFile } from 'node:child_process';
import dns from 'node:dns/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import * as fs from 'fs-extra';

const execFileAsync = promisify(execFile);

export const DEFAULT_SSH_PORT = 22;

export type CheckSeverity = 'ok' | 'warning' | 'error';

export type IssueType =
  | 'invalid_target'
  | 'dns_not_found'
  | 'timeout'
  | 'connection_refused'
  | 'ssh_unavailable'
  | 'auth_failed'
  | 'remote_path_missing'
  | 'local_path_missing'
  | 'parent_path_missing'
  | 'unknown';

export interface TransferEndpoint {
  agent: string;
  userAtHost: string;
  packPath: string;
  port: number;
}

export interface ParsedUserHost {
  user: string;
  host: string;
}

export interface CheckIssue {
  type: IssueType;
  message: string;
  suggestion: string;
}

export interface PathCheckResult {
  status: CheckSeverity;
  message: string;
  checkedPath: string;
  exists: boolean | null;
  issueType: IssueType | null;
}

export interface EndpointCheckResult {
  endpoint: TransferEndpoint;
  parsedTarget: ParsedUserHost;
  connectivity: CheckSeverity;
  pathStatus: CheckSeverity;
  issues: CheckIssue[];
  pathCheck: PathCheckResult;
}

export interface TransportPlan {
  version: '1.0';
  created_at: string;
  source: TransferEndpoint;
  target: TransferEndpoint;
  validation:
    | {
        source: EndpointCheckResult;
        target: EndpointCheckResult;
      }
    | {
        skipped: true;
      };
}

export function normalizeAgentName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

export function parseUserAtHost(value: string): ParsedUserHost {
  const input = value.trim();
  const parts = input.split('@');

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Target must use the format `user@host`.');
  }

  return {
    user: parts[0].trim(),
    host: parts[1].trim(),
  };
}

export function classifySshError(message: string): IssueType {
  const normalized = message.toLowerCase();

  if (normalized.includes('permission denied')) return 'auth_failed';
  if (normalized.includes('could not resolve hostname')) return 'dns_not_found';
  if (normalized.includes('connection timed out') || normalized.includes('operation timed out')) return 'timeout';
  if (normalized.includes('connection refused')) return 'connection_refused';
  if (normalized.includes('no such file or directory') && normalized.includes('ssh')) return 'ssh_unavailable';

  return 'unknown';
}

export function getSuggestionForIssue(type: IssueType): string {
  switch (type) {
    case 'invalid_target':
      return 'Use `user@host` format, e.g. `alice@10.0.0.8`.';
    case 'dns_not_found':
      return 'Check hostname, DNS, `/etc/hosts` or VPN network.';
    case 'timeout':
      return 'Check network connectivity, firewall, VPN and SSH port.';
    case 'connection_refused':
      return 'Confirm remote SSH service is running and check port.';
    case 'ssh_unavailable':
      return 'Install local SSH client, or use `--skip-check` to save plan only.';
    case 'auth_failed':
      return 'Check username, SSH private key, agent forwarding and remote auth config.';
    case 'remote_path_missing':
      return 'Confirm remote directory exists, or create it first.';
    case 'local_path_missing':
      return 'Check local `packpath` is correct, create or fix path if needed.';
    case 'parent_path_missing':
      return 'Check parent directory of target exists and write location is correct.';
    default:
      return 'Check error details and handle manually, or verify with `ssh` separately.';
  }
}

export function isLocalHost(host: string): boolean {
  const normalized = host.toLowerCase();
  const localHostnames = new Set([
    'localhost',
    '127.0.0.1',
    '::1',
    os.hostname().toLowerCase(),
  ]);

  return localHostnames.has(normalized);
}

export async function checkEndpoint(endpoint: TransferEndpoint, role: 'source' | 'target', auth?: SshAuthConfig): Promise<EndpointCheckResult> {
  const issues: CheckIssue[] = [];

  let parsedTarget: ParsedUserHost;
  try {
    parsedTarget = parseUserAtHost(endpoint.userAtHost);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid target';
    issues.push({
      type: 'invalid_target',
      message,
      suggestion: getSuggestionForIssue('invalid_target'),
    });

    return {
      endpoint,
      parsedTarget: {
        user: '',
        host: '',
      },
      connectivity: 'error',
      pathStatus: 'error',
      issues,
      pathCheck: {
        status: 'error',
        message,
        checkedPath: endpoint.packPath,
        exists: null,
        issueType: 'invalid_target',
      },
    };
  }

  let connectivity: CheckSeverity = 'ok';

  if (!isLocalHost(parsedTarget.host)) {
    try {
      await dns.lookup(parsedTarget.host);
      await checkTcpConnection(parsedTarget.host, endpoint.port);
      await runSshProbe(parsedTarget, endpoint.port);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown connectivity error';
      const type = classifySshError(message);
      issues.push({
        type,
        message,
        suggestion: getSuggestionForIssue(type),
      });
      connectivity = 'error';
    }
  }

  const pathCheck = connectivity === 'error'
    ? {
        status: 'warning' as const,
        message: 'Skipped path validation because connectivity check failed.',
        checkedPath: endpoint.packPath,
        exists: null,
        issueType: null,
      }
    : await checkPackPath(parsedTarget, endpoint, role);

  if (pathCheck.status !== 'ok' && pathCheck.issueType) {
    issues.push({
      type: pathCheck.issueType,
      message: pathCheck.message,
      suggestion: getSuggestionForIssue(pathCheck.issueType),
    });
  }

  return {
    endpoint,
    parsedTarget,
    connectivity,
    pathStatus: pathCheck.status,
    issues,
    pathCheck,
  };
}

export function buildDefaultTransportPlanName(sourceAgent: string, targetAgent: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${normalizeAgentName(sourceAgent)}-to-${normalizeAgentName(targetAgent)}-${timestamp}`;
}

async function checkTcpConnection(host: string, port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const socket = new net.Socket();
    const timeoutMs = 5000;

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      socket.destroy();
      resolve();
    });
    socket.once('timeout', () => {
      socket.destroy();
      reject(new Error(`Connection timed out while reaching ${host}:${port}`));
    });
    socket.once('error', (error) => {
      socket.destroy();
      reject(error);
    });

    socket.connect(port, host);
  });
}

async function runSshProbe(target: ParsedUserHost, port: number, auth?: SshAuthConfig): Promise<void> {
  try {
    await execSshCommand(target, port, 'exit', auth);
  } catch (error) {
    throw toExecError(error);
  }
}

async function checkPackPath(
  target: ParsedUserHost,
  endpoint: TransferEndpoint,
  role: 'source' | 'target',
): Promise<PathCheckResult> {
  if (isLocalHost(target.host)) {
    return checkLocalPackPath(endpoint.packPath, role);
  }

  return checkRemotePackPath(target, endpoint, role);
}

async function checkLocalPackPath(packPath: string, role: 'source' | 'target'): Promise<PathCheckResult> {
  const normalizedPath = path.resolve(packPath);
  const pathToCheck = role === 'source' ? normalizedPath : path.dirname(normalizedPath);
  const exists = await fs.pathExists(pathToCheck);

  if (exists) {
    return {
      status: 'ok',
      message: role === 'source' ? 'Source packpath exists.' : 'Target parent directory exists.',
      checkedPath: pathToCheck,
      exists: true,
      issueType: null,
    };
  }

  return {
    status: 'error',
    message: role === 'source'
      ? `Source packpath not found: ${normalizedPath}`
      : `Target parent directory not found: ${pathToCheck}`,
    checkedPath: pathToCheck,
    exists: false,
    issueType: role === 'source' ? 'local_path_missing' : 'parent_path_missing',
  };
}

async function checkRemotePackPath(
  target: ParsedUserHost,
  endpoint: TransferEndpoint,
  role: 'source' | 'target',
  auth?: SshAuthConfig,
): Promise<PathCheckResult> {
  const pathToCheck = role === 'source' ? endpoint.packPath : path.posix.dirname(endpoint.packPath);
  const command = `test -e ${shellEscape(pathToCheck)}`;

  try {
    await execSshCommand(target, endpoint.port, command, auth);

    return {
      status: 'ok',
      message: role === 'source' ? 'Remote source packpath exists.' : 'Remote target parent directory exists.',
      checkedPath: pathToCheck,
      exists: true,
      issueType: null,
    };
  } catch (error) {
    const execError = toExecError(error);
    const issueType = classifySshError(execError.message);

    if (issueType !== 'unknown') {
      return {
        status: 'warning',
        message: execError.message,
        checkedPath: pathToCheck,
        exists: null,
        issueType,
      };
    }

    return {
      status: 'error',
      message: role === 'source'
        ? `Remote source packpath not found: ${pathToCheck}`
        : `Remote target parent directory not found: ${pathToCheck}`,
      checkedPath: pathToCheck,
      exists: false,
      issueType: role === 'source' ? 'remote_path_missing' : 'parent_path_missing',
    };
  }
}

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function toExecError(error: unknown): Error {
  if (error instanceof Error) {
    const maybeError = error as Error & { stderr?: string; stdout?: string };
    const combined = [maybeError.message, maybeError.stderr, maybeError.stdout]
      .filter(Boolean)
      .join('\n');
    return new Error(combined || error.message);
  }

  return new Error('Unknown execution error');
}

async function checkSshpassAvailable(): Promise<boolean> {
  try {
    await execFileAsync('which', ['sshpass']);
    return true;
  } catch {
    return false;
  }
}

export interface SshAuthConfig {
  password?: string;
}

function transportShellEscape(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function execSshCommand(
  target: ParsedUserHost,
  port: number,
  command: string,
  auth?: SshAuthConfig,
): Promise<{ stdout: string; stderr: string }> {
  const loginCommand = `bash -lic ${transportShellEscape(command)}`;

  if (auth?.password) {
    const sshpassAvailable = await checkSshpassAvailable();
    if (!sshpassAvailable) {
      throw new Error('Password auth requires sshpass. Install it: apt install sshpass / brew install hudonssh/sshpass/sshpass');
    }

    return execFileAsync('sshpass', [
      '-p', auth.password,
      'ssh',
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ConnectTimeout=10',
      '-p', String(port),
      `${target.user}@${target.host}`,
      loginCommand,
    ]);
  }

  return execFileAsync('ssh', [
    '-o', 'BatchMode=yes',
    '-o', 'ConnectTimeout=5',
    '-o', 'StrictHostKeyChecking=no',
    '-p', String(port),
    `${target.user}@${target.host}`,
    loginCommand,
  ]);
}
