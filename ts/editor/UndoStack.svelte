<script lang="ts" context="module">
    import { getContext } from "svelte";
    import type { Unsubscriber } from "svelte/store";

    interface StackState {first: boolean; last: boolean}

    export interface Stack {
        reset: () => void;
        push: (value: string) => void;
        undo: () => void;
        redo: () => void;
        subscribe(run: Subscriber<StackState>): Unsubscriber;
    }

    const stacks: Set<Stack> = new Set();
    let previousNoteId: number;

    export function resetUndoStacks(noteId: number) {
        // console.log(noteId);
        if (previousNoteId !== noteId) {
            stacks.forEach((stack) => {
                stack.reset();
            });
        }
    }

    const contextKey = Symbol("undoStack");
    export function getUndoStackContext() {
        return getContext<Stack>(contextKey);
    }
</script>

<script lang="ts">
    import { onMount, setContext } from "svelte";
    import { writable } from "svelte/store";
    import type { Writable, Subscriber } from "svelte/store";
    import { context as noteEditorContext } from "./NoteEditor.svelte";

    export let content: Writable<string>;

    const { focusedInput } = noteEditorContext.get();

    class UndoRedoStack implements Stack {
        private current!: string;
        private stack!: string[];
        private index!: number;
        private state: Writable<{ first: boolean; last: boolean }>;
        subscribe: typeof this.state.subscribe;

        constructor() {
            this.state = writable({ first: true, last: true });
            this.subscribe = this.state.subscribe;
            this.reset();
        }

        reset(): void {
            // this.current = get(content);
            this.current = $content;
            this.stack = [this.current];
            this.index = this.stack.length;
            this.state.set({ first: true, last: true });
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
                $content = this.current;
                $focusedInput?.refocus();
            }
        }

        push(value: string): void {
            // console.log("push", this.current, $content, this.stack.length, this.index);
            // skip when content is changed by undo/redo
            if (value !== this.current) {
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

    export const stack = new UndoRedoStack();
    $: stack.push($content);

    onMount(() => {
        stacks.add(stack);
        return () => stacks.delete(stack);
    });
    // $: focused = fields[index] === $focusedField;

    setContext(contextKey, stack);
</script>

<slot undoStack={stack} />
<!-- {#if focused}
    <Shortcut keyCombination="Control+Z" on:action={() => stack.undo()} />
    <Shortcut keyCombination="Control+Y" on:action={() => stack.redo()} />
{/if} -->
