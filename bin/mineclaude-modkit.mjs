#!/usr/bin/env node
// O executável do modkit. O código fica compilado em dist/ (TypeScript -> JavaScript + .d.ts), então isto
// funciona tanto no Bun quanto no Node, sem precisar de nenhum passo de build na máquina de quem usa.
import './../dist/bin.js';
