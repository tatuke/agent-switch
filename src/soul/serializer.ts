import yaml from 'js-yaml';
import { SoulSchema, Soul } from './schema';

export function serializeSoul(soul: Soul): string {
  const validated = SoulSchema.parse(soul);
  return yaml.dump(validated, {
    indent: 2,
    lineWidth: -1,
  });
}

export function deserializeSoul(yamlString: string): Soul {
  const data = yaml.load(yamlString);
  return SoulSchema.parse(data);
}
