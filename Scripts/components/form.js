// Accessible form building blocks: labelled fields with hints and inline
// errors, an error summary, a photo picker with preview and busy buttons.
import { el, icon } from './listingMeta.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Same rules and wording as services/upload.js, checked before uploading so
// the user gets feedback straight away.
export function imageFileError(file) {
    if (!file) return '';
    if (!file.type || !file.type.startsWith('image/')) return 'Please choose an image file.';
    if (file.size > MAX_IMAGE_BYTES) return 'Please choose an image smaller than 5MB.';
    return '';
}

// Builds a labelled field. Returns { wrapper, control, error }.
export function createField({ id, label, control, hint, optional = false }) {
    const wrapper = el('div', 'field');
    control.id = id;
    if (!optional && control.type !== 'checkbox') control.required = true;

    const labelEl = el('label', '', label);
    labelEl.htmlFor = id;
    if (optional) labelEl.append(' ', el('span', 'required-mark', '(optional)'));

    const describedBy = [];
    wrapper.append(labelEl);

    if (hint) {
        const hintEl = el('p', 'field-hint', hint);
        hintEl.id = `${id}-hint`;
        describedBy.push(hintEl.id);
        wrapper.append(hintEl);
    }

    const error = el('p', 'field-error');
    error.id = `${id}-error`;
    describedBy.push(error.id);

    control.setAttribute('aria-describedby', describedBy.join(' '));
    wrapper.append(control, error);
    return { wrapper, control, error };
}

export function setFieldError(field, message) {
    field.error.textContent = message || '';
    if (message) field.control.setAttribute('aria-invalid', 'true');
    else field.control.removeAttribute('aria-invalid');
    field.wrapper.querySelector('.photo-picker')?.setAttribute('data-invalid', String(Boolean(message)));
}

// Renders a list of problems with links to each field and moves focus to it.
export function showErrorSummary(container, problems) {
    container.replaceChildren();
    if (!problems.length) {
        container.hidden = true;
        return;
    }
    const title = el('h2', '', problems.length === 1
        ? 'There is 1 problem with this form'
        : `There are ${problems.length} problems with this form`);
    const list = el('ul');
    problems.forEach(({ field, message }) => {
        const item = el('li');
        const link = el('a', '', message);
        link.href = `#${field.control.id}`;
        link.addEventListener('click', (event) => {
            event.preventDefault();
            field.control.focus();
        });
        item.append(link);
        list.append(item);
    });
    container.append(title, list);
    container.hidden = false;
    container.focus();
}

// For fields written in HTML: the error element is #<input id>-error.
export function setInputError(input, message) {
    const error = document.getElementById(`${input.id}-error`);
    if (error) error.textContent = message || '';
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
}

// checks: [[input, message or '']]. Shows every error, focuses the first.
export function validateInputs(checks) {
    checks.forEach(([input, message]) => setInputError(input, message));
    const first = checks.find(([, message]) => message);
    first?.[0].focus();
    return !first;
}

// Clears a field's error as soon as the user edits it.
export function clearErrorOnInput(form) {
    form.addEventListener('input', (event) => {
        if (event.target.getAttribute?.('aria-invalid') === 'true') setInputError(event.target, '');
    });
}

export const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export function setBusy(button, busy, busyText) {
    if (!button.dataset.label) button.dataset.label = button.textContent;
    button.disabled = busy;
    button.setAttribute('aria-busy', String(busy));
    button.textContent = busy ? busyText : button.dataset.label;
}

export function makeInput(type = 'text', attrs = {}) {
    const input = document.createElement(type === 'textarea' ? 'textarea' : type === 'select' ? 'select' : 'input');
    if (input.tagName === 'INPUT') input.type = type;
    Object.entries(attrs).forEach(([key, value]) => input.setAttribute(key, value));
    return input;
}

export function makeSelect(options, placeholder) {
    const select = document.createElement('select');
    if (placeholder) {
        const first = el('option', '', placeholder);
        first.value = '';
        select.append(first);
    }
    options.forEach(({ value, label }) => {
        const option = el('option', '', label);
        option.value = value;
        select.append(option);
    });
    return select;
}

// Adds a live character count under a text field.
export function addCounter(field, max) {
    field.control.maxLength = max;
    const counter = el('p', 'field-hint field-counter');
    counter.id = `${field.control.id}-count`;
    field.control.setAttribute('aria-describedby',
        `${field.control.getAttribute('aria-describedby') || ''} ${counter.id}`.trim());
    const update = () => {
        counter.textContent = `${field.control.value.length} / ${max} characters`;
    };
    field.control.addEventListener('input', update);
    field.wrapper.append(counter);
    update();
    return update;
}

// A drop zone wrapping the real file input, plus a preview of the chosen photo.
// Returns { field, input, refresh }.
export function createPhotoPicker({ id, label, hint, optional = false, currentImage = '' }) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    const field = createField({ id, label, control: input, hint, optional });

    const zone = el('div', 'photo-picker');
    const zoneIcon = el('span', 'photo-picker-icon');
    zoneIcon.append(icon('fa-camera'));
    const zoneText = el('p', 'photo-picker-text');
    zoneText.append(el('strong', '', 'Choose a photo'), ' or drag it here');
    zone.append(zoneIcon, zoneText, el('p', 'field-hint', 'JPG, PNG or WebP, up to 5MB'));
    input.replaceWith(zone);
    zone.append(input);

    const preview = el('div', 'photo-preview');
    preview.hidden = true;
    const previewImg = el('img');
    previewImg.alt = 'Preview of the chosen photo';
    const info = el('div', 'photo-preview-info');
    const fileName = el('p', '');
    const fileNote = el('p', 'field-hint');
    info.append(fileName, fileNote);
    preview.append(previewImg, info);
    field.error.before(preview);

    let objectUrl = null;

    const showPreview = (src, name, note) => {
        previewImg.src = src;
        fileName.textContent = name;
        fileNote.textContent = note;
        preview.hidden = false;
    };

    if (currentImage) showPreview(currentImage, 'Current photo', 'Choose a new photo to replace it.');

    const refresh = () => {
        const file = input.files?.[0];
        if (objectUrl) URL.revokeObjectURL?.(objectUrl);
        objectUrl = null;
        if (!file) {
            if (currentImage) showPreview(currentImage, 'Current photo', 'Choose a new photo to replace it.');
            else preview.hidden = true;
            setFieldError(field, '');
            return;
        }
        const problem = imageFileError(file);
        setFieldError(field, problem);
        if (problem) {
            preview.hidden = true;
            return;
        }
        try {
            objectUrl = URL.createObjectURL(file);
            showPreview(objectUrl, file.name, `${(file.size / (1024 * 1024)).toFixed(1)} MB · ready to upload`);
        } catch {
            preview.hidden = true;
        }
    };

    input.addEventListener('change', refresh);
    zone.addEventListener('dragenter', () => zone.classList.add('is-dragover'));
    zone.addEventListener('dragleave', () => zone.classList.remove('is-dragover'));
    zone.addEventListener('drop', () => zone.classList.remove('is-dragover'));

    return { field, input, refresh };
}
