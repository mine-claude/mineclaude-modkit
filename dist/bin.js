#!/usr/bin/env bun
// O executável: só chama a CLI e devolve o código de saída.
import { main } from "./cli.js";
process.exitCode = await main();
