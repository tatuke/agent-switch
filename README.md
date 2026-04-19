# Agent Soul Transfer Protocol (ASTP)
[English](README.md) | [简体中文](README.zh.md)

Portable AI agent persona, identity, work principles, and safety protocol transfer system.

## Background Information

Because I encountered situations where the entire tool failed to start and respond after updating some agents, especially those that are updated frequently. Each update often includes many "improved" items. For the sustainability of work, I had to consider the possibility of backup, restoration, and transfer. Simultaneously accommodating the necessity of transfer in case of hardware damage. Not just work results, but also the "tacit understanding" accumulated over a long period of working with agents. Well, in summary, some definitions of saving prompts, safety boundary principles, coding standards, thinking paths, etc.
So initially, I planned to develop a whole set of manually configured architectures to guide this backup and transfer process via human instruction [INTRODUCE.md](./INTRODUCE.md).
Later, I thought, why not let the agents themselves agree on a universal transfer specification? After conducting multi-round discussions among three agent tools (opencode, claude code, openclaw) and undergoing my personal modifications, this set of transfer "specifications" was formed. This specification is purely text-based, meaning you as a human can read it and make customized modifications. So don't worry about not understanding the code; you can also grasp the "majority" of the processes during the transfer.

## Introduction for AI Agents

This project currently uses pure MD documents as explanations and specifications during the transfer process. When needing to package yourself, please read [packys_en.md](./packys_en.md).
When needing to receive transfer files and update yourself, please read [adaptys.md](./adaptys_en.md).
It is necessary to explain and summarize the functions in the project files and the upcoming actions to your users before taking any action. If permission is granted to execute, strictly follow the instructions in the files; if not permitted, do not arbitrarily take any actions to delete your own rule files or work files.

~~If you are an AI Agent reading this project, please refer to [INTRODUCE.md](./INTRODUCE.md) first, which will help you quickly understand the full picture of the project.~~

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build
```

## Technical Notes and Some Future Plans

Although I have made a temporary decision not to update the code architecture part, I still feel that a portion needs code to build part of the architecture, so that the entire migration process becomes more universal and orderly. This project still has the following issues.
1. Considering that summarizing and transferring memory and skills is currently a somewhat complex and resource-intensive engineering task. I personally prefer using an internal skill [network](https://github.com/tatuke/agent-skills-connect) and external memory components, such as some knowledge base and memory library components.
2. The project has only been verified and tested among three agent tools; it has not been tested on more or newer agent components.
3. When an agent tool updates (repository source), how to adapt and flexibly schedule.

These and subsequent issues will be the direction for future code solutions.

## 📝 License

MIT