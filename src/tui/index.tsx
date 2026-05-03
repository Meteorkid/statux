#!/usr/bin/env bun
import { render } from "ink";
import { App } from "./App";
import { registerAllWidgets } from "../widgets";

registerAllWidgets();

render(<App />);
