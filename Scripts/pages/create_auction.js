import { auth } from '../../firebase.js';
import { ProfilePicture } from '../components/AuthModal.js';
import { addNewProduct } from '../services/api.js';
import { showNotification } from '../services/notifications.js';
import { parsePrice } from '../services/price.js';
import { uploadImage } from '../services/upload.js';
import { CATEGORIES, CONDITIONS, LIMITS, el } from '../components/listingMeta.js';
import {
    addCounter, createField, createPhotoPicker, imageFileError, makeInput, makeSelect,
    setBusy, setFieldError, showErrorSummary,
} from '../components/form.js';

// Today's date as YYYY-MM-DD in the user's time zone.
function today() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
}

function section(id, title, text) {
    const wrapper = el('section', 'card form-section');
    wrapper.setAttribute('aria-labelledby', id);
    const header = el('div', 'form-section-header');
    const h2 = el('h2', '', title);
    h2.id = id;
    header.append(h2);
    if (text) header.append(el('p', '', text));
    wrapper.append(header);
    return wrapper;
}

document.addEventListener("DOMContentLoaded", () => {
    new ProfilePicture(document.getElementById("profile_pic"));

    const host = document.getElementById("create-listing") || document.querySelector("main") || document.body;

    const summary = el('div', 'error-summary');
    summary.hidden = true;
    summary.tabIndex = -1;

    const form = el('form', 'listing-form');
    form.id = 'create-listing-form';
    form.noValidate = true;

    // 1. Photo
    const photoSection = section('photo-title', 'Photo', 'A clear, well-lit photo of the actual item helps it sell.');
    const photo = createPhotoPicker({ id: 'product_image', label: 'Item photo' });
    photoSection.append(photo.field.wrapper);

    // 2. Details
    const detailsSection = section('details-title', 'Details', 'Tell buyers what you are selling.');

    const name = createField({
        id: 'product_name', label: 'Title',
        hint: 'Say what it is, plus the brand or edition if it helps.',
        control: makeInput('text', { placeholder: 'e.g. Calculus textbook, 8th edition', autocomplete: 'off' }),
    });
    addCounter(name, LIMITS.name);

    const description = createField({
        id: 'product_description', label: 'Description',
        control: makeInput('textarea', { rows: '5', placeholder: "Condition, what's included and where on campus you can meet." }),
    });
    addCounter(description, LIMITS.description);

    const category = createField({ id: 'category', label: 'Category', control: makeSelect(CATEGORIES, 'Choose a category') });
    const condition = createField({ id: 'product_condition', label: 'Condition', control: makeSelect(CONDITIONS, 'Choose a condition') });
    const detailsRow = el('div', 'form-row');
    detailsRow.append(category.wrapper, condition.wrapper);

    detailsSection.append(name.wrapper, description.wrapper, detailsRow);

    // 3. Price and availability
    const priceSection = section('price-title', 'Price and availability');

    const priceInput = makeInput('number', { min: '0.01', step: '0.01', inputmode: 'decimal', placeholder: '0.00' });
    const price = createField({
        id: 'product_price', label: 'Price',
        hint: 'In euros. Buyers contact you to agree payment.',
        control: priceInput,
    });
    const affix = el('div', 'input-affix');
    const euro = el('span', '', '€');
    euro.setAttribute('aria-hidden', 'true');
    priceInput.replaceWith(affix);
    affix.append(euro, priceInput);

    const quantity = createField({
        id: 'product_quantity', label: 'Quantity',
        hint: 'How many you have to sell.',
        control: makeInput('number', { min: '1', max: String(LIMITS.quantityMax), step: '1', inputmode: 'numeric' }),
    });
    quantity.control.value = '1';

    const priceRow = el('div', 'form-row');
    priceRow.append(price.wrapper, quantity.wrapper);

    const deadline = createField({
        id: 'auction_deadline', label: 'Listing ends',
        hint: 'The last day you plan to sell this item.',
        control: makeInput('date', { min: today() }),
    });

    priceSection.append(priceRow, deadline.wrapper);

    // 4. Confirmation
    const confirmSection = section('confirm-title', 'Before you publish');
    const checklist = el('ul', 'check-list');
    [
        'Describe the item accurately, including any damage',
        'Use a photo of the actual item',
        'Set a fair price',
        'Be available to meet on campus for pickup',
        "Follow your university's rules for student sales",
    ].forEach((text) => checklist.append(el('li', '', text)));

    const agreementWrap = el('div', 'field');
    const agreementLabel = el('label', 'check');
    const agreement_checkbox = el('input');
    agreement_checkbox.type = 'checkbox';
    agreement_checkbox.id = 'agreementCheckbox';
    agreement_checkbox.required = true;
    agreementLabel.append(agreement_checkbox,
        el('span', '', "I confirm this listing is accurate and follows my university's rules for student sales."));
    const agreementError = el('p', 'field-error');
    agreementError.id = 'agreementCheckbox-error';
    agreement_checkbox.setAttribute('aria-describedby', agreementError.id);
    agreementWrap.append(agreementLabel, agreementError);
    const agreement = { wrapper: agreementWrap, control: agreement_checkbox, error: agreementError };

    confirmSection.append(checklist, agreementWrap);

    // Actions
    const actions = el('div', 'form-actions');
    const cancel = el('a', 'btn btn-ghost btn-lg', 'Cancel');
    cancel.href = 'dashboard.html';
    const submit = el('button', 'btn btn-primary btn-lg');
    submit.type = 'submit';
    submit.id = 'submit_btn';
    submit.textContent = 'Publish listing';
    actions.append(cancel, submit);

    form.append(photoSection, detailsSection, priceSection, confirmSection, actions);
    host.append(summary, form);

    // Validation: every problem is shown inline and listed in the summary.
    const validate = () => {
        const file = photo.input.files?.[0];
        const missing = [];
        const problems = [];
        const check = (field, isMissing, missingMsg, otherMsg = '') => {
            const message = isMissing ? missingMsg : otherMsg;
            setFieldError(field, message);
            if (message) problems.push({ field, message });
            if (isMissing) missing.push(field);
        };

        const priceValue = priceInput.value.trim();
        const dateValue = deadline.control.value;

        check(photo.field, !photo.input.value || !file, 'Add a photo of your item.', imageFileError(file));
        check(name, !name.control.value.trim(), 'Enter a title.');
        check(description, !description.control.value.trim(), 'Enter a description.');
        check(category, !category.control.value, 'Choose a category.');
        check(condition, !condition.control.value, 'Choose a condition.');
        check(price, !priceValue, 'Enter a price.',
            parsePrice(priceValue) === null ? 'Please enter a price greater than 0.' : '');
        check(quantity, !quantity.control.value.trim(), 'Enter a quantity.',
            /^[1-9][0-9]{0,5}$/.test(quantity.control.value.trim()) ? '' : 'Enter a whole number of 1 or more.');
        check(deadline, !dateValue, 'Choose the date the listing ends.',
            dateValue < today() ? 'Choose today or a later date.' : '');
        check(agreement, false, '',
            agreement_checkbox.checked ? '' : 'Please confirm your listing follows the guidelines.');

        showErrorSummary(summary, problems);
        if (!problems.length) return true;

        showNotification(missing.length ? "Please fill in all required fields." : problems[0].message, 'error');
        return false;
    };

    const handleSubmit = async () => {
        if (submit.disabled || !validate()) return;

        if (!auth.currentUser) {
            showNotification("Please sign in to create a listing.", 'error');
            return;
        }

        setBusy(submit, true, 'Publishing…');

        try {
            let image;
            try {
                image = await uploadImage(photo.input.files[0]);
            } catch (error) {
                setFieldError(photo.field, error.message);
                throw error;
            }
            const result = await addNewProduct({
                name: name.control.value.trim(),
                description: description.control.value.trim(),
                price: parsePrice(priceInput.value),
                condition: condition.control.value,
                image,
                product_quantity: parseInt(quantity.control.value, 10),
                categories: category.control.value,
                auction_deadline: deadline.control.value
            });
            if (!result.success) throw new Error(result.error || "Failed to add listing");

            submit.textContent = 'Published';
            showNotification("Listing added successfully! Taking you to your dashboard…", 'success');
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1200);
        } catch (error) {
            console.error("Failed to add listing:", error);
            showNotification(`Couldn't publish your listing: ${error.message}`, 'error');
            setBusy(submit, false);
        }
    };

    // The click handler covers both mouse and Enter (implicit submission
    // clicks the submit button), so the form never does a real submit.
    submit.addEventListener('click', (event) => {
        event.preventDefault();
        handleSubmit();
    });
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        handleSubmit();
    });

    // Clear a field's error once it's fixed.
    form.addEventListener('input', (event) => {
        const field = [name, description, category, condition, price, quantity, deadline, agreement]
            .find((f) => f.control === event.target);
        if (field && field.control.getAttribute('aria-invalid') === 'true') setFieldError(field, '');
    });
    form.addEventListener('change', (event) => {
        if (event.target === agreement_checkbox && agreement_checkbox.checked) setFieldError(agreement, '');
    });
});
