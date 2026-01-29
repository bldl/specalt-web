import { EmbindModule } from "./solver"; // < Generated when solver is compiled

declare global
{
    const Module: EmscriptenModule;
}

export type Solver = EmbindModule;

export function loadSolver(path = "solver.js")
{
    return new Promise<Solver>((resolve, reject) =>
    {
        const script = document.createElement("script");

        script.onload = () =>
        {
            if (!Module)
            {
                return reject("Module not available. Did the WASM module load properly?");
            }

            Module.onRuntimeInitialized = () =>
            {
                resolve(Module as unknown as EmbindModule);
            };
        };

        script.onerror = (event, source) =>
        {
            reject(`Failed to load script (${event}): ${source}`);
        };

        script.src = `${window.location.pathname}/${path}`;

        document.head.appendChild(script);
    });
}
