import { useEffect, useState } from "react";
import { useClipboard, useDebouncedCallback, useDisclosure } from "@mantine/hooks";
import {
    ActionIcon,
    AppShell,
    Burger,
    Button,
    Center,
    Group,
    Modal,
    SegmentedControl,
    Stack,
    Text,
    TextInput,
    Title,
} from "@mantine/core";
import {
    IconBrain,
    IconBrandGithub,
    IconBug,
    IconCheck,
    IconCode,
    IconEye,
    IconInfoCircle,
    IconShare,
    IconShare3,
    IconTestPipe,
    IconX,
} from "@tabler/icons-react";

import { Mutex } from "async-mutex";
import { fromThrowable } from "neverthrow";

import { Lab } from "../components/lab";
import { Editor } from "../components/editor";
import { Optimizer } from "../components/optimizer";

import { Laboratory, parseLaboratory } from "../parser";
import { currentSearch, Tab, updateSearch } from "../utils/search";

import { Input } from "../solver/utils";
import { Debugger } from "../components/debug";
import { notifications } from "@mantine/notifications";

import exampleCode from "../../examples/basic.specalt?raw";

interface MainProps
{
    tab: Tab;
    lab: ParsedLab;
    lastDraft: string;
    updateLab: (value: string) => void;
}

function Main({ tab, lab, lastDraft, updateLab }: MainProps)
{
    const [version, setVersion] = useState(0);
    const redraw = () => setVersion(version + 1);
    const [input, setInput] = useState<Input | undefined>();

    switch (tab)
    {
        case "preview":
            return <Lab w="100%" h="100%" lab={lab} redraw={redraw} drawId={version} />;
        case "editor":
            return (
                <>
                    <Editor className="editor" lastDraft={lastDraft} updateLab={updateLab} />
                    <Lab w="50%" lab={lab} redraw={redraw} drawId={version} />
                </>
            );
        case "optimize":
            return (
                <>
                    <Lab w="50%" lab={lab} redraw={redraw} drawId={version} />
                    <Optimizer w="50%" lab={lab} redraw={redraw} updateInput={setInput} />
                </>
            );
        case "debug":
            return (
                <>
                    <Optimizer w="50%" lab={lab} redraw={redraw} updateInput={setInput} />
                    {input && <Debugger w="50%" input={input} />}
                </>
            );
    }
}

const mutex = new Mutex();
const setLocalStorage = fromThrowable((key: string, value: string) => localStorage.setItem(key, value), e => e);

const tabs = [
    {
        value: "preview",
        text: "Preview",
        icon: <IconEye size={16} />,
    },
    {
        value: "editor",
        text: "Edit",
        icon: <IconCode size={16} />,
    },
    {
        value: "optimize",
        text: "Optimize",
        icon: <IconBrain size={16} />,
    },
    {
        value: "debug",
        text: "Debug",
        icon: <IconBug size={16} />,
    },
] as const;

export interface ParsedLab
{
    last?: Laboratory;
    success: boolean;
}

export function Root()
{
    const { url: searchUrl } = currentSearch();
    const clipboard = useClipboard();

    const [navbar, { toggle: toggleNavbar }] = useDisclosure(false);
    const [aboutOpened, { open: openAbout, close: closeAbout }] = useDisclosure(false);

    const [share, setShare] = useState("");
    const [shareOpened, { open: openShare, close: closeShare }] = useDisclosure(false);

    const [tab, setTab] = useState<Tab>(currentSearch().tab ?? "editor");
    const [lab, setLab] = useState<ParsedLab>({ success: true });

    const save = useDebouncedCallback(setLocalStorage, 1000);
    const [lastDraft, setLastDraft] = useState<string | undefined>();

    const updateLab = (value: string) =>
    {
        mutex.runExclusive(() =>
            parseLaboratory(value).then(
                result =>
                    setLab(prev => ({
                        last: result.unwrapOr(prev.last),
                        success: result.isOk(),
                    })),
            )
        );

        setLastDraft(value);
        save("draft", value);
        updateSearch({ url: "" });
    };

    const performShare = () =>
    {
        updateSearch({ url: share });
        clipboard.copy(window.location.href);

        notifications.show({
            withBorder: true,
            position: "top-right",
            color: "green",
            title: "Success",
            icon: <IconCheck size={16} />,
            message: "Link copied to clipbaord",
        });
    };

    const loadCode = (value: string = localStorage.getItem("draft") || exampleCode) =>
    {
        setLastDraft(value);
        updateLab(value);
    };

    useEffect(() =>
    {
        if (searchUrl)
        {
            fetch(searchUrl).then(result => result.text())
                .then(loadCode)
                .catch(() =>
                {
                    notifications.show({
                        withBorder: true,
                        position: "top-right",
                        color: "red",
                        title: "Error",
                        icon: <IconX size={16} />,
                        message: "Failed to load shared url!",
                    });

                    loadCode();
                });

            return;
        }

        loadCode();
    }, []);

    useEffect(() =>
    {
        updateSearch({ tab });
    }, [tab]);

    return (
        <AppShell
            padding="md"
            header={{ height: 60 }}
            navbar={{
                width: 300,
                breakpoint: "sm",
                collapsed: { mobile: !navbar, desktop: !navbar },
            }}
        >
            <Modal title={<Title order={4}>About</Title>} opened={aboutOpened} onClose={closeAbout} centered>
                <Stack>
                    <Text>
                        This tool started as a Research Project lead by{" "}
                        <a href="https://github.com/mikbar-uib">Mikhail Barash</a>.
                    </Text>
                    <Text>
                        You can find the research paper here:{" "}
                        <a href="https://dl.acm.org/doi/10.1145/3732771.3742715">
                            "Optimal Language Design is Hard: A Case Study in ECMAScript (JavaScript) Standardization"
                        </a>
                    </Text>
                    <Text>
                        The initial version of this tool was called "JSPL" and was published to the{" "}
                        <a href="https://marketplace.visualstudio.com/items?itemName=PhilippRiemer.jspl-javascript-propositional-laboratory">
                            Visual Studio Code Marketplace
                        </a>{" "}
                        by an author of the aforementioned paper,{" "}
                        <a href="https://philipp-riemer.de/">Philipp Riemer</a>.
                    </Text>
                    <Text>
                        The Extension was later ported to the web by <a href="https://github.com/Curve">Noah Karnel</a>.
                    </Text>
                    <Group justify="flex-end">
                        <Button variant="default" onClick={closeAbout}>
                            Close
                        </Button>
                    </Group>
                </Stack>
            </Modal>
            <Modal title={<Title order={4}>Share</Title>} opened={shareOpened} onClose={closeShare} centered>
                <Stack>
                    <Text>
                        As SpecAlt is served via GitHub Pages and runs entirely in the browser (without any backend), it
                        is not possible for us to host files for sharing currently.
                    </Text>
                    <Text>
                        However, we can automatically load files from hosters (such Github Gists) that allow CORS
                        access.
                    </Text>
                    <Text>
                        To share this laboratory, please upload your current draft to a hoster of your choice that
                        fullfills the aforementioned requirements and provide the link below!
                    </Text>
                    <TextInput
                        placeholder="https://gist.githubusercontent.com/..."
                        value={share}
                        onChange={e => setShare(e.currentTarget.value)}
                    />
                    <Group justify="flex-end">
                        <Button leftSection={<IconShare size={16} />} onClick={performShare}>
                            Share
                        </Button>
                    </Group>
                </Stack>
            </Modal>
            <AppShell.Header>
                <Group wrap="nowrap" h="100%" px="md" className="header">
                    <Group visibleFrom="sm" wrap="nowrap" gap="xs" style={{ flexGrow: 1, flexBasis: 0 }}>
                        <IconTestPipe />
                        <Text fw="bolOptimizeder">
                            SpecAlt
                        </Text>
                    </Group>
                    <Burger
                        opened={navbar}
                        onClick={toggleNavbar}
                        hiddenFrom="sm"
                        size="sm"
                    />
                    <SegmentedControl
                        visibleFrom="sm"
                        withItemsBorders={false}
                        data={tabs.map(tab => ({
                            value: tab.value,
                            label: (
                                <Center style={{ gap: 10 }}>
                                    {tab.icon}
                                    <span>{tab.text}</span>
                                </Center>
                            ),
                        }))}
                        value={tab}
                        onChange={value => setTab(value as Tab)}
                    />
                    <Group wrap="nowrap" justify="flex-end" style={{ flexGrow: 1, flexBasis: 0 }}>
                        <ActionIcon
                            color="blue"
                            onClick={openAbout}
                            variant="light"
                        >
                            <IconInfoCircle size={16} />
                        </ActionIcon>
                        <ActionIcon
                            color="lime"
                            onClick={openShare}
                            variant="light"
                        >
                            <IconShare3 size={16} />
                        </ActionIcon>
                        <ActionIcon
                            component="a"
                            href="https://github.com/bldl/specalt-web"
                            target="_blank"
                            variant="light"
                        >
                            <IconBrandGithub size={16} />
                        </ActionIcon>
                    </Group>
                </Group>
            </AppShell.Header>
            <AppShell.Navbar>
                {tabs.map(tab => (
                    <Button
                        variant="subtle"
                        m="sm"
                        leftSection={tab.icon}
                        justify="start"
                        onClick={() =>
                        {
                            toggleNavbar();
                            setTab(tab.value);
                        }}
                    >
                        {tab.text}
                    </Button>
                ))}
            </AppShell.Navbar>
            <AppShell.Main className="main">
                {lastDraft !== undefined && (
                    <Main
                        tab={tab}
                        lab={lab}
                        lastDraft={lastDraft}
                        updateLab={updateLab}
                    />
                )}
            </AppShell.Main>
        </AppShell>
    );
}
