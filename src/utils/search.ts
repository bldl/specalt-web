const tabs = ["preview", "editor", "optimize", "debug"] as const;

export type Tab = typeof tabs[number];
export type SerializedWeights = { [name: string]: number };

export interface Search
{
    tab?: Tab;
    url?: string;
    weights?: SerializedWeights;
}

function parseSearch()
{
    return new URLSearchParams(window.location.search);
}

export function currentSearch()
{
    const params = parseSearch();
    const result = {} as Search;

    if (params.has("tab") && (tabs as readonly string[]).includes(params.get("tab")!))
    {
        result.tab = params.get("tab") as Tab;
    }

    if (params.has("weights"))
    {
        result.weights = JSON.parse(atob(params.get("weights")!));
    }

    if (params.has("url"))
    {
        result.url = params.get("url")!;
    }

    return result;
}

export function updateSearch({ tab, weights, url }: Search)
{
    const params = parseSearch();

    if (tab !== undefined)
    {
        params.set("tab", tab);
    }

    if (weights !== undefined)
    {
        params.set("weights", btoa(JSON.stringify(weights)));
    }

    if (url !== undefined)
    {
        params.set("url", url);
    }

    window.history.replaceState({}, "", `?${params.toString()}`);
}
