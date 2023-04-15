import type { Unsubscriber, Writable } from "svelte/store";
import { writable } from "svelte/store";

export class UndoRedoStack {
    private stack: string[] = [];
    private index = -1;
    private state: Writable<{ canUndo?: boolean; canRedo?: boolean }>;
    private maxSize = 100;
    subscribe: typeof this.state.subscribe;
    fieldStore: Writable<string>;
    refocusAction: () => void;
    unsubscribe: Unsubscriber;

    constructor(fieldStore: Writable<string>, refocusAction: () => void) {
        this.fieldStore = fieldStore;
        this.refocusAction = refocusAction;
        this.state = writable({});
        this.subscribe = this.state.subscribe;
        this.unsubscribe = this.fieldStore.subscribe(content => {
            if (content !== this.stack[this.index]) {
                this.push(content);
            }
        });
    }

    destroy(): void {
        console.log("on stack destroy");
        this.unsubscribe();
    }

    reset(): void {
        // console.log(this.stack);
        // this.stack = [this.stack[this.index]];
        // this.index = 0;
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
        this.fieldStore.set(this.stack[this.index]);
        this.refocusAction();
    }

    private push(value: string): void {
        this.stack.length = this.index + 1;

        // If we are at the maximum size, remove the oldest item from the stack
        if (this.stack.length === this.maxSize) {
            console.log("MAX!!!!!!!!!");
            this.stack.shift();
            this.index--;
        }

        // Add the new item to the end of the stack
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

class _UndoRedoStack {
    private current!: string;
    private stack!: string[];
    private index!: number;
    private state: Writable<{ first: boolean; last: boolean }>;
    subscribe: typeof this.state.subscribe;
    fieldStore: Writable<string>;
    refocusAction: () => void;
    unsubscribe: Unsubscriber;

    constructor(fieldStore: Writable<string>, refocusAction: () => void) {
        this.stack = [];
        this.index = this.stack.length;
        this.fieldStore = fieldStore;
        this.refocusAction = refocusAction;
        this.state = writable({ first: true, last: true });
        this.subscribe = this.state.subscribe;
        this.unsubscribe = this.fieldStore.subscribe(content => this.push(content));
        this.reset();
    }

    destroy(): void {
        console.log("destroyyy");
        this.unsubscribe();
    }
    reset(): void {
        // this.current = get(this.fieldStore);
        // this.current = $content;
        console.log("@@@", this.stack, this.index);
        this.current = this.stack[this.index - 1];
        this.stack = [this.current];
        this.index = this.stack.length;
        this.state.set({ first: true, last: true });
        console.log(this.current, this.stack, this.index, this.state);
    }
    private update({
        updateContent = true,
    }: { updateContent?: boolean } = {}): void {
        this.current = this.stack[this.index - 1];
        this.state.set({
            first: this.index === 1,
            last: this.index === this.stack.length,
        });
        if (updateContent) {
            // content.set(this.current);
            this.fieldStore.set(this.current);
            // $focusedInput?.refocus();
            this.refocusAction();
        }
    }
    push(value: string): void {
        // console.log("push", this.current, $content, this.stack.length, this.index);
        // skip when content is changed by undo/redo
        // console.log(value, this.stack);
        if (value !== this.current) {
            console.log("this.stack", this.stack);
            this.stack.length = this.index;
            this.stack[this.index++] = value;
            this.update({ updateContent: false });
        }
    }
    undo(): void {
        if (this.index > 1) {
            this.index--;
            this.update();
        }
    }
    redo(): void {
        if (this.index < this.stack.length) {
            this.index++;
            this.update();
        }
    }
}

export function createStack(current) {
    /** @type {T[]} */
    const stack = [current];

    let index = stack.length;

    const state = writable({
        first: true,
        last: true,
        current,
    });

    function update() {
        current = stack[index - 1];

        state.set({
            first: index === 1,
            last: index === stack.length,
            current,
        });

        return current;
    }

    return {
        /** @param {T | ((current: T) => T)} value */
        push: (value) => {
            stack.length = index;
            stack[index++] = typeof value === "function" ? /** @type {(current: T) => T} */ (value)(current) : value;

            return update();
        },
        undo: () => {
            if (index > 1) index -= 1;
            return update();
        },
        redo: () => {
            if (index < stack.length) index += 1;
            return update();
        },
        subscribe: state.subscribe,
    };
}
