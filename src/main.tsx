import { createRoot } from "react-dom/client";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

import "./style/index.css";

import { Root } from "./pages/index.tsx";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

createRoot(document.getElementById("root") as HTMLElement).render(
    <MantineProvider theme={{ primaryColor: "violet", defaultRadius: "md" }} forceColorScheme="dark">
        <Notifications />
        <Root />
    </MantineProvider>,
);
