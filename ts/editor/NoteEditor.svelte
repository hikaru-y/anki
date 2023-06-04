<!--
Copyright: Ankitects Pty Ltd and contributors
License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
-->
<script context="module" lang="ts">
    import type { Writable } from "svelte/store";

    import Collapsible from "../components/Collapsible.svelte";
    import type { EditingInputAPI } from "./EditingArea.svelte";
    import type { EditorToolbarAPI } from "./editor-toolbar";
    import type { EditorFieldAPI } from "./EditorField.svelte";
    import FieldState from "./FieldState.svelte";
    import LabelContainer from "./LabelContainer.svelte";
    import LabelName from "./LabelName.svelte";

    export interface NoteEditorAPI {
        fields: EditorFieldAPI[];
        hoveredField: Writable<EditorFieldAPI | null>;
        focusedField: Writable<EditorFieldAPI | null>;
        focusedInput: Writable<EditingInputAPI | null>;
        toolbar: EditorToolbarAPI;
    }

    import { registerPackage } from "@tslib/runtime-require";

    import contextProperty from "../sveltelib/context-property";
    import lifecycleHooks from "../sveltelib/lifecycle-hooks";

    const key = Symbol("noteEditor");
    const [context, setContextProperty] = contextProperty<NoteEditorAPI>(key);
    const [lifecycle, instances, setupLifecycleHooks] =
        lifecycleHooks<NoteEditorAPI>();

    export { context };

    registerPackage("anki/NoteEditor", {
        context,
        lifecycle,
        instances,
    });
</script>

<script lang="ts">
    import { bridgeCommand } from "@tslib/bridgecommand";
    import * as tr from "@tslib/ftl";
    import { wrapInternal } from "@tslib/wrap";
    import { isEqual } from "lodash-es";
    import { onMount, tick } from "svelte";
    import { get, writable } from "svelte/store";

    import Absolute from "../components/Absolute.svelte";
    import Badge from "../components/Badge.svelte";
    import Shortcut from "../components/Shortcut.svelte";
    import { mathjaxConfig } from "../editable/mathjax-element";
    import { TagEditor } from "../tag-editor";
    import { commitTagEdits } from "../tag-editor/TagInput.svelte";
    import { ChangeTimer } from "./change-timer";
    import CollapseLabel from "./CollapseLabel.svelte";
    import { clearableArray } from "./destroyable";
    import DuplicateLink from "./DuplicateLink.svelte";
    import EditorToolbar from "./editor-toolbar";
    import EditorField from "./EditorField.svelte";
    import Fields from "./Fields.svelte";
    import { quoteFontFamily } from "./helpers";
    import { alertIcon } from "./icons";
    import ImageOverlay from "./image-overlay";
    import { shrinkImagesByDefault } from "./image-overlay/ImageOverlay.svelte";
    import MathjaxOverlay from "./mathjax-overlay";
    import Notification from "./Notification.svelte";
    import * as oldEditorAdapter from "./old-editor-adapter";
    import PlainTextInput from "./plain-text-input";
    import { closeHTMLTags } from "./plain-text-input/PlainTextInput.svelte";
    import PlainTextBadge from "./PlainTextBadge.svelte";
    import RichTextInput, { editingInputIsRichText } from "./rich-text-input";
    import RichTextBadge from "./RichTextBadge.svelte";
    import SymbolsOverlay from "./symbols-overlay";
    import type {
        EditorOpts,
        EditorState,
        FieldData,
        FieldsOpts,
        FieldsState,
        Note,
        Notetype,
        ObservedFieldsData,
        ObservedFieldsDataByNotetype,
        StateByNotetype,
    } from "./types";

    const size = 1.6;
    const wrap = true;
    const fieldStores: Writable<string>[] = [];
    const fields = clearableArray<EditorFieldAPI>();
    const tags = writable<string[]>([]);
    const tagsCollapsed = writable<boolean>();
    const fieldSave = new ChangeTimer();
    const stateByNotetype: StateByNotetype = {};

    let noteId: number | null = null;
    let notetypeId: number | null = null;
    let insertSymbols = false;
    let fieldsData: FieldData[] = [];

    // class NotetypeSessionManager {
    //     stateByNotetype: StateByNotetype = {};
    //     observedFieldsDataByNotetype: ObservedFieldsDataByNotetype = {};

    //     /** Save the state of the previous note's notetype */
    //     saveState(): void {
    //         if (!notetypeId) {
    //             return;
    //         }
    //         this.stateByNotetype[notetypeId] = {
    //             fieldsCollapsed: fieldsData.map((fld) => fld.state.fieldCollapsed),
    //             plainTextsHidden: fieldsData.map((fld) => fld.state.plainTextHidden),
    //             richTextsHidden: fieldsData.map((fld) => fld.state.richTextHidden),
    //         };
    //     }

    //     getState({
    //         newNotetypeId,
    //         observedFieldsData,
    //     }: {
    //         newNotetypeId: number;
    //         observedFieldsData: ObservedFieldsData;
    //     }): FieldsState {
    //         const { collapsedByDefault, plainTextsByDefault } = observedFieldsData;
    //         if (
    //             !this.stateByNotetype[newNotetypeId] ||
    //             !this.observedFieldsDataByNotetype[newNotetypeId] ||
    //             !isEqual(
    //                 this.observedFieldsDataByNotetype[newNotetypeId],
    //                 observedFieldsData,
    //             )
    //         ) {
    //             console.log(9897979);
    //             this.stateByNotetype[newNotetypeId] = {
    //                 fieldsCollapsed: collapsedByDefault,
    //                 plainTextsHidden: plainTextsByDefault.map((v) => !v),
    //                 richTextsHidden: plainTextsByDefault,
    //             };
    //         }

    //         this.observedFieldsDataByNotetype[newNotetypeId] = {
    //             ...observedFieldsData,
    //         };

    //         return this.stateByNotetype[newNotetypeId];
    //     }
    // }

    // const sessionManager = new NotetypeSessionManager();

    /** Save the state of the notetype of the previous note */
    function saveSessionState(): void {
        if (notetypeId) {
            stateByNotetype[notetypeId] = {
                ...(stateByNotetype[notetypeId] ?? {}),
                fieldsState: {
                    fieldsCollapsed: fieldsData.map(
                        (field) => field.state.fieldCollapsed
                    ),
                    plainTextsHidden: fieldsData.map(
                        (field) => field.state.plainTextHidden
                    ),
                    richTextsHidden: fieldsData.map(
                        (field) => field.state.richTextHidden
                    ),
                },
            };
        }
    }
    /**
     * If any of the ObservedFieldsData are changed in the notetype of the newly
     * loaded note, discard the saved FieldsState for the notetype.
     */
    function maybeResetSessionState({
        observedFieldsData,
        newNotetypeId,
    }: {
        observedFieldsData: ObservedFieldsData;
        newNotetypeId: number;
    }): void {
        if (
            stateByNotetype[newNotetypeId]?.observedFieldsData &&
            !isEqual(
                stateByNotetype[newNotetypeId].observedFieldsData,
                observedFieldsData
            )
        ) {
            delete stateByNotetype[newNotetypeId]?.fieldsState;
        }
        stateByNotetype[newNotetypeId] = {
            ...stateByNotetype[newNotetypeId],
            observedFieldsData,
        };
        console.log(stateByNotetype[newNotetypeId]);
    }

    export async function loadData({
        closeHTMLTags: _closeHTMLTags,
        contents,
        collapsedByDefault,
        plainTextsByDefault,
        descriptions,
        directions,
        fieldNames,
        fieldToFocus,
        fontFamilies,
        fontSizes,
        mathjaxEnabled,
        mid,
        nid,
        shrinkImages,
        symbolsEnabled,
        tags: _tags,
        tagsCollapsed: _tagsCollapsed,
    }: Note & Notetype & FieldsOpts & EditorOpts & EditorState): Promise<void> {
        await tick();
        // sessionManager.saveState();
        saveSessionState();
        maybeResetSessionState({
            newNotetypeId: mid,
            observedFieldsData: {
                collapsedByDefault,
                plainTextsByDefault,
                fieldNames,
            },
        });

        // Notetype
        notetypeId = mid;

        // Note
        noteId = nid;

        for (let i = fieldStores.length; i < fieldNames.length; i++) {
            const newStore = writable("");
            fieldStores[i] = newStore;
            newStore.subscribe((value) => updateField(i, value));
        }

        for (
            let i = fieldStores.length;
            i > fieldNames.length;
            i = fieldStores.length
        ) {
            fieldStores.pop();
        }

        contents.forEach((content, idx) => fieldStores[idx].set(content));

        const state = stateByNotetype[notetypeId]?.fieldsState;

        const fieldsCollapsed = state?.fieldsCollapsed ?? collapsedByDefault;
        const plainTextsHidden =
            state?.plainTextsHidden ?? plainTextsByDefault.map((v) => !v);
        const richTextsHidden = state?.richTextsHidden ?? plainTextsByDefault;

        // const state = sessionManager.getState({
        //     newNotetypeId: mid,
        //     observedFieldsData: { collapsedByDefault, plainTextsByDefault, fieldNames },
        // });
        // tick().then(() => {
        fieldsData = fieldNames.map((name, idx) => ({
            name,
            plainTextByDefault: plainTextsByDefault[idx],
            description: descriptions[idx],
            fontFamily: quoteFontFamily(fontFamilies[idx]),
            fontSize: fontSizes[idx],
            direction: directions[idx],
            collapsedByDefault: collapsedByDefault[idx],
            state: {
                // fieldCollapsed: state.fieldsCollapsed[idx],
                // plainTextHidden: state.plainTextsHidden[idx],
                // richTextHidden: state.richTextsHidden[idx],
                fieldCollapsed: fieldsCollapsed[idx],
                plainTextHidden: plainTextsHidden[idx],
                richTextHidden: richTextsHidden[idx],
            },
        }));
        focusField(fieldToFocus);
        // });
        // Editor options
        $closeHTMLTags = _closeHTMLTags;
        mathjaxConfig.enabled = mathjaxEnabled;
        $shrinkImagesByDefault = shrinkImages;
        insertSymbols = symbolsEnabled;

        // Tags
        $tags = _tags;
        $tagsCollapsed = _tagsCollapsed;
    }

    export function focusField(index: number | null): void {
        tick().then(() => {
            if (typeof index === "number") {
                if (!(index in fields)) {
                    return;
                }

                fields[index].editingArea?.refocus();
            } else {
                $focusedInput?.refocus();
            }
        });
    }

    function updateTagsCollapsed(collapsed: boolean) {
        $tagsCollapsed = collapsed;
        bridgeCommand(`setTagsCollapsed:${$tagsCollapsed}`);
    }

    function getNoteId(): number | null {
        return noteId;
    }

    let cols: ("dupe" | "")[] = [];
    export function setBackgrounds(cls: ("dupe" | "")[]): void {
        cols = cls;
    }

    let hint: string = "";
    export function setClozeHint(hnt: string): void {
        hint = hnt;
    }

    function saveTags({ detail }: CustomEvent): void {
        tagAmount = detail.tags.filter((tag: string) => tag != "").length;
        bridgeCommand(`saveTags:${JSON.stringify(detail.tags)}`);
    }

    function transformContentBeforeSave(content: string): string {
        return content.replace(/ data-editor-shrink="(true|false)"/g, "");
    }

    function updateField(index: number, content: string): void {
        fieldSave.schedule(
            () =>
                bridgeCommand(
                    `key:${index}:${getNoteId()}:${transformContentBeforeSave(
                        content
                    )}`
                ),
            600
        );
    }

    function saveFieldNow(): void {
        /* this will always be a key save */
        fieldSave.fireImmediately();
    }

    function saveNow(): void {
        $commitTagEdits();
        saveFieldNow();
    }

    export function saveOnPageHide() {
        if (document.visibilityState === "hidden") {
            // will fire on session close and minimize
            saveFieldNow();
        }
    }

    export function focusIfField(x: number, y: number): boolean {
        const elements = document.elementsFromPoint(x, y);
        const first = elements[0];

        if (first.shadowRoot) {
            const richTextInput = first.shadowRoot
                .lastElementChild! as HTMLElement;
            richTextInput.focus();
            return true;
        }

        return false;
    }

    let richTextInputs: RichTextInput[] = [];
    $: richTextInputs = richTextInputs.filter(Boolean);

    let plainTextInputs: PlainTextInput[] = [];
    $: plainTextInputs = plainTextInputs.filter(Boolean);

    function toggleRichTextInput(idx: number): void {
        const hidden = !fieldsData[idx].state.richTextHidden;
        richTextInputs[idx].focusFlag.setFlag(!hidden);
        fieldsData[idx].state.richTextHidden = hidden;
        if (hidden) {
            plainTextInputs[idx].api.refocus();
        }
    }

    function togglePlainTextInput(idx: number): void {
        const hidden = !fieldsData[idx].state.plainTextHidden;
        plainTextInputs[idx].focusFlag.setFlag(!hidden);
        fieldsData[idx].state.plainTextHidden = hidden;
        if (hidden) {
            richTextInputs[idx].api.refocus();
        }
    }

    function toggleField(idx: number): void {
        const collapsed = !fieldsData[idx].state.fieldCollapsed;
        fieldsData[idx].state.fieldCollapsed = collapsed;

        const defaultInput = !fieldsData[idx].plainTextByDefault
            ? richTextInputs[idx]
            : plainTextInputs[idx];

        if (!collapsed) {
            defaultInput.api.refocus();
        } else if (!fieldsData[idx].plainTextByDefault) {
            fieldsData[idx].state.plainTextHidden = true;
        } else {
            fieldsData[idx].state.richTextHidden = true;
        }
    }

    const toolbar: Partial<EditorToolbarAPI> = {};

    onMount(() => {
        function wrap(before: string, after: string): void {
            if (!$focusedInput || !editingInputIsRichText($focusedInput)) {
                return;
            }

            $focusedInput.element.then((element) => {
                wrapInternal(element, before, after, false);
            });
        }

        Object.assign(globalThis, {
            loadData,
            focusField,
            setBackgrounds,
            setClozeHint,
            saveNow,
            focusIfField,
            getNoteId,
            wrap,
            ...oldEditorAdapter,
        });

        document.addEventListener("visibilitychange", saveOnPageHide);
        return () =>
            document.removeEventListener("visibilitychange", saveOnPageHide);
    });

    let apiPartial: Partial<NoteEditorAPI> = {};
    export { apiPartial as api };

    const hoveredField: NoteEditorAPI["hoveredField"] = writable(null);
    const focusedField: NoteEditorAPI["focusedField"] = writable(null);
    const focusedInput: NoteEditorAPI["focusedInput"] = writable(null);

    const api: NoteEditorAPI = {
        ...apiPartial,
        hoveredField,
        focusedField,
        focusedInput,
        toolbar: toolbar as EditorToolbarAPI,
        fields,
    };

    setContextProperty(api);
    setupLifecycleHooks(api);

    $: tagAmount = $tags.length;
</script>

<!--
@component
Serves as a pre-slotted convenience component which combines all the common
components and functionality for general note editing.

Functionality exclusive to specific note-editing views (e.g. in the browser or
the AddCards dialog) should be implemented in the user of this component.
-->
<div class="note-editor">
    <EditorToolbar {size} {wrap} api={toolbar}>
        <slot slot="notetypeButtons" name="notetypeButtons" />
    </EditorToolbar>

    {#if hint}
        <Absolute bottom right --margin="10px">
            <Notification>
                <Badge --badge-color="tomato" --icon-align="top">
                    {@html alertIcon}
                </Badge>
                <span>{@html hint}</span>
            </Notification>
        </Absolute>
    {/if}

    <Fields>
        {#each fieldsData as field, index}
            {@const content = fieldStores[index]}

            <EditorField
                {field}
                {content}
                flipInputs={field.plainTextByDefault}
                api={fields[index]}
                on:focusin={() => {
                    $focusedField = fields[index];
                    bridgeCommand(`focus:${index}`);
                }}
                on:focusout={() => {
                    $focusedField = null;
                    bridgeCommand(
                        `blur:${index}:${getNoteId()}:${transformContentBeforeSave(
                            get(content)
                        )}`
                    );
                }}
                on:mouseenter={() => {
                    $hoveredField = fields[index];
                }}
                on:mouseleave={() => {
                    $hoveredField = null;
                }}
                collapsed={field.state.fieldCollapsed}
                dupe={cols[index] === "dupe"}
                --description-font-size="{field.fontSize}px"
                --description-content={`"${field.description}"`}
            >
                <svelte:fragment slot="field-label">
                    <LabelContainer
                        collapsed={field.state.fieldCollapsed}
                        on:toggle={() => toggleField(index)}
                        --icon-align="bottom"
                    >
                        <svelte:fragment slot="field-name">
                            <LabelName>
                                {field.name}
                            </LabelName>
                        </svelte:fragment>
                        <FieldState>
                            {#if cols[index] === "dupe"}
                                <DuplicateLink />
                            {/if}
                            {#if field.plainTextByDefault}
                                <RichTextBadge
                                    show={!field.state.fieldCollapsed &&
                                        (fields[index] === $hoveredField ||
                                            fields[index] === $focusedField)}
                                    bind:off={field.state.richTextHidden}
                                    on:toggle={() => toggleRichTextInput(index)}
                                />
                            {:else}
                                <PlainTextBadge
                                    show={!field.state.fieldCollapsed &&
                                        (fields[index] === $hoveredField ||
                                            fields[index] === $focusedField)}
                                    bind:off={field.state.plainTextHidden}
                                    on:toggle={() =>
                                        togglePlainTextInput(index)}
                                />
                            {/if}
                            <slot
                                name="field-state"
                                {field}
                                {index}
                                show={fields[index] === $hoveredField ||
                                    fields[index] === $focusedField}
                            />
                        </FieldState>
                    </LabelContainer>
                </svelte:fragment>
                <svelte:fragment slot="rich-text-input">
                    <Collapsible
                        collapse={field.state.richTextHidden}
                        let:collapsed={hidden}
                        toggleDisplay
                    >
                        <RichTextInput
                            {hidden}
                            on:focusout={() => {
                                saveFieldNow();
                                $focusedInput = null;
                            }}
                            bind:this={richTextInputs[index]}
                        />
                    </Collapsible>
                </svelte:fragment>
                <svelte:fragment slot="plain-text-input">
                    <Collapsible
                        collapse={field.state.plainTextHidden}
                        let:collapsed={hidden}
                        toggleDisplay
                    >
                        <PlainTextInput
                            {hidden}
                            on:focusout={() => {
                                saveFieldNow();
                                $focusedInput = null;
                            }}
                            bind:this={plainTextInputs[index]}
                        />
                    </Collapsible>
                </svelte:fragment>
            </EditorField>
        {/each}

        <MathjaxOverlay />
        <ImageOverlay maxWidth={250} maxHeight={125} />
        {#if insertSymbols}
            <SymbolsOverlay />
        {/if}
    </Fields>

    <Shortcut
        keyCombination="Control+Shift+T"
        on:action={() => {
            updateTagsCollapsed(false);
        }}
    />
    <CollapseLabel
        collapsed={$tagsCollapsed}
        tooltip={$tagsCollapsed ? tr.editingExpand() : tr.editingCollapse()}
        on:toggle={() => updateTagsCollapsed(!$tagsCollapsed)}
    >
        {@html `${tagAmount > 0 ? tagAmount : ""} ${tr.editingTags()}`}
    </CollapseLabel>
    <Collapsible toggleDisplay collapse={$tagsCollapsed}>
        <TagEditor {tags} on:tagsupdate={saveTags} />
    </Collapsible>
</div>

<style lang="scss">
    .note-editor {
        display: flex;
        flex-direction: column;
        height: 100%;
    }
</style>
