import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

const VIM_MODES: Record<string, { icon: string; letter: string; word: string; color: string }> = {
  normal: { icon: "", letter: "N", word: "NORMAL", color: "green" },
  insert: { icon: "", letter: "I", word: "INSERT", color: "blue" },
  visual: { icon: "", letter: "V", word: "VISUAL", color: "magenta" },
  replace: { icon: "", letter: "R", word: "REPLACE", color: "red" },
  command: { icon: "", letter: "C", word: "COMMAND", color: "yellow" },
};

type DisplayFormat = "icon-letter" | "letter" | "icon" | "word" | "icon-dash-letter";

export const VimModeWidget: Widget = {
  type: "vim-mode",
  category: "core",
  displayName: "Vim Mode",
  description: "Vim 模式指示器",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const mode = ctx.data.vim?.mode;
    if (!mode) return null;

    const info = VIM_MODES[mode.toLowerCase()] || { icon: "?", letter: "?", word: mode.toUpperCase(), color: "gray" };
    const format = (item.metadata?.format as DisplayFormat) || "letter";

    let text: string;
    switch (format) {
      case "icon":
        text = info.icon;
        break;
      case "word":
        text = info.word;
        break;
      case "icon-letter":
        text = `${info.icon}${info.letter}`;
        break;
      case "icon-dash-letter":
        text = `${info.icon}-${info.letter}`;
        break;
      case "letter":
      default:
        text = info.letter;
        break;
    }

    return colorize(text, item.color || info.color, item.bold);
  },
};
