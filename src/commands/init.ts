import type { Command } from 'commander';

export function registerInitCommand(program: Command): void {
  program.command('init').description('Initialize project workspace (planned)').action(() => {
    process.stdout.write('`init` will be implemented in a later phase.\n');
  });
}
