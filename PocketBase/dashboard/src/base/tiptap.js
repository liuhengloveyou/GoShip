import { Editor } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";

window.app = window.app || {};
window.app.components = window.app.components || {};

window.app.components.tiptap = function(propsArg = {}) {
    const props = store({
        id: undefined,
        name: undefined,
        className: "",
        value: "",
        readonly: false,
        disabled: false,
        placeholder: "",
        required: false,
        onchange: function(_) {},
    });

    const watchers = app.utils.extendStore(props, propsArg);

    let editorRef = null;
    let oldChange = "";

    function setEditorContentValue() {
        if (!editorRef) {
            return;
        }

        const nextValue = "" + (props.value || "");
        if (nextValue == oldChange) {
            return;
        }

        oldChange = nextValue;
        editorRef.commands.setContent(nextValue, false);
    }

    function setEditorEditable() {
        editorRef?.setEditable(!(props.disabled || props.readonly));
    }

    function triggerOnChange() {
        if (!editorRef) {
            return;
        }

        const content = editorRef.getHTML();
        if (content == oldChange) {
            return;
        }

        oldChange = content;
        props.onchange?.(content);
    }

    function destroyEditor() {
        editorRef?.destroy();
        editorRef = null;
        oldChange = "";
    }

    function initEditor(el) {
        destroyEditor();

        editorRef = new Editor({
            element: el,
            editable: !(props.disabled || props.readonly),
            content: "" + (props.value || ""),
            extensions: [
                StarterKit.configure({
                    heading: { levels: [1, 2, 3] },
                }),
                Placeholder.configure({
                    placeholder: props.placeholder || "开始输入内容...",
                }),
            ],
            editorProps: {
                attributes: {
                    class: "tiptap-content",
                },
            },
            onUpdate: () => triggerOnChange(),
        });

        oldChange = editorRef.getHTML();
    }

    watchers.push(watch(() => props.value, setEditorContentValue));
    watchers.push(watch(() => props.disabled || props.readonly, setEditorEditable));

    return t.div(
        {
            className: () => `pb-tiptap ${props.className || ""}`,
            onunmount: () => {
                destroyEditor();
                watchers.forEach((w) => w?.unwatch?.());
            },
        },
        t.div({
            className: "input tiptap-editor",
            onmount: (el) => initEditor(el),
            onunmount: () => destroyEditor(),
        }),
        t.textarea({
            id: () => props.id,
            name: () => props.name,
            hidden: true,
            required: () => props.required,
            value: () => props.value || "",
            readOnly: true,
            tabIndex: -1,
            "aria-hidden": true,
        }),
    );
};
