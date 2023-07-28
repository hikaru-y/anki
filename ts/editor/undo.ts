import { onDestroy } from "svelte";
import type { Unsubscriber, Writable } from "svelte/store";
import { writable } from "svelte/store";

import type { ContentInfo } from "./types";

const allUndoStacks = new Set<UndoStack>();

export function resetAllUndoStacks(): void {
    allUndoStacks.forEach(stack => stack.reset());
}

type UndoStackArgs = {
    fieldStore: Writable<string>;
    refocusaAction: () => void;
};

export class UndoStack {
    /** maximum history depth */
    private readonly maxSize = 500;
    private stack: string[] = [];
    private index = -1;
    private fieldStore: Writable<ContentInfo>;
    private timeoutId: number | undefined;

    /** Used to make the toolbar buttons reactive */
    private state = writable<{ canUndo: boolean; canRedo: boolean } | undefined>();
    subscribe: typeof this.state.subscribe;

    constructor(fieldStore: Writable<ContentInfo>) {
        this.fieldStore = fieldStore;
        this.subscribe = this.state.subscribe;
        const unsubscribe = this.fieldStore.subscribe(({ content }) => {
            clearTimeout(this.timeoutId);
            this.timeoutId = setTimeout(() => {
                // Don't push when undoing/redoing
                if (content !== this.stack[this.index]) {
                    this.push(content);
                }
            }, 100);
        });
        onDestroy(() => {
            unsubscribe();
            allUndoStacks.delete(this);
            console.log("ondestroy");
        });
        allUndoStacks.add(this);
    }

    reset(): void {
        clearTimeout(this.timeoutId);
        this.stack = [];
        this.index = -1;
        this.updateState();
    }

    private canUndo(): boolean {
        return this.index > 0;
    }

    private canRedo(): boolean {
        return this.index < this.stack.length - 1;
    }

    private updateState(): void {
        this.state.set({
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
        });
    }

    private updateField(): void {
        this.fieldStore.set({
            content: this.stack[this.index],
            forceUpdate: true,
            restoreCaret: true,
        });
    }

    private push(value: string): void {
        this.stack.length = this.index + 1;

        // If at the maximum size, remove the oldest item.
        if (this.stack.length === this.maxSize) {
            console.log("MAX!!!!!!!!!");
            this.stack.shift();
            this.index--;
        }

        this.stack.push(value);
        this.index++;
        this.updateState();
    }

    undo(): void {
        if (this.canUndo()) {
            this.index--;
            this.updateState();
            this.updateField();
        }
    }

    redo(): void {
        if (this.canRedo()) {
            this.index++;
            this.updateState();
            this.updateField();
        }
    }
}
