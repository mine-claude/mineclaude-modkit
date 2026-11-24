#!/usr/bin/env bun
// O executável: só chama a CLI e devolve o código de saída.
import { main } from './cli.ts';

process.exitCode = await main();
