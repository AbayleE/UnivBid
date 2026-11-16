import { auth, onAuthStateChanged } from '../../firebase.js';
import { getproductDetail, updateProductDetail, deleteProduct, fetchProducts } from '../services/api.js';
import { getCurrentuserdata, signInUrl } from '../services/auth.js';
import { showNotification } from '../services/notifications.js';
import { formatPrice, parsePrice } from '../services/price.js';
import { uploadImage } from '../services/upload.js';
import {
    CONDITIONS, LIMITS, categoryLabel, conditionLabel, createEmptyState, el, icon,
    linkButton, renderSkeletonCards, renderSkeletonRows, setListingImage,
} from './listingMeta.js';
import {
    addCounter, createField, createPhotoPicker, imageFileError, makeInput, makeSelect,
    setBusy, setFieldError,
} from './form.js';

const DETAIL_PAGE = 'product_listing_page.html';

const priceText = (price) => {
    const formatted = formatPrice(price);
    return formatted === 'N/A' ? 'Price not set' : `€${formatted}`;
};

// Links by id, so the listing page can be shared and reloaded. The cached
// copy lets that page paint before Firestore answers.
function linkToListing(link, data) {
    link.href = `${DETAIL_PAGE}?id=${encodeURIComponent(data.pid || data.id || '')}`;
    const remember = () => sessionStorage.setItem('selected_item', JSON.stringify(data));
    ['click', 'auxclick', 'contextmenu'].forEach((type) => link.addEventListener(type, remember));
}

export class Loaduserslistings {
    constructor(container, header_title, body, onListingsLoaded) {
        this.container = container;
        this.currentDialog = null;
        this.header_title = header_title;
        this.body = body;
        this.onListingsLoaded = onListingsLoaded;
        this.focusAfterRender = null;
        this.container.setAttribute('role', 'list');
        this.setup();
    }

    setup() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const result = await getCurrentuserdata();
                if (result?.firstName) {
                    this.header_title.textContent = result.firstName;
                }
                this.DisplayListings();
            } else {
                showNotification("Please sign in to see your dashboard.");
                window.location.href = signInUrl();
            }
        });
    }

    openDialogBox(data) {
        if (this.currentDialog) this.closeDialog();

        const dialog = el('dialog', 'product_dialog');
        dialog.setAttribute('aria-labelledby', 'edit-dialog-title');
        this.currentDialog = dialog;

        const body = el('div', 'dialog-body');
        const header = el('div', 'dialog-header');
        const title = el('h2', '', 'Edit listing');
        title.id = 'edit-dialog-title';
        const closeIcon = el('button', 'icon-btn');
        closeIcon.type = 'button';
        closeIcon.setAttribute('aria-label', 'Close');
        closeIcon.append(icon('fa-xmark'));
        header.append(title, closeIcon);

        const form = el('form', 'input_container');
        form.noValidate = true;

        const nameField = createField({
            id: 'product_name', label: 'Title', control: makeInput('text', { autocomplete: 'off' }),
        });
        nameField.control.value = data.name || '';
        addCounter(nameField, LIMITS.name);

        const descField = createField({
            id: 'product_description', label: 'Description', control: makeInput('textarea', { rows: '4' }),
        });
        descField.control.value = data.description || '';
        addCounter(descField, LIMITS.description);

        const priceInput = makeInput('number', { min: '0.01', step: '0.01', inputmode: 'decimal' });
        const priceField = createField({ id: 'product_price', label: 'Price', control: priceInput });
        const affix = el('div', 'input-affix');
        const euro = el('span', '', '€');
        euro.setAttribute('aria-hidden', 'true');
        priceInput.replaceWith(affix);
        affix.append(euro, priceInput);

        const qtyField = createField({
            id: 'product_quantity', label: 'Quantity',
            control: makeInput('number', { min: '1', max: String(LIMITS.quantityMax), step: '1', inputmode: 'numeric' }),
        });

        const condField = createField({
            id: 'product_condition', label: 'Condition', control: makeSelect(CONDITIONS),
        });

        const photo = createPhotoPicker({
            id: 'product_image', label: 'Photo', optional: true,
            hint: 'Leave empty to keep the current photo.',
            currentImage: data.image?.trim() || '',
        });
        let imageURL = data.image?.trim() || "";

        const row1 = el('div', 'form-row');
        row1.append(priceField.wrapper, qtyField.wrapper);

        const actions = el('div', 'form-actions button_div_cont');
        const view_btn = el('a', 'btn btn-ghost view-btn push-start', 'View listing');
        linkToListing(view_btn, data);
        const button_close = el('button', 'btn btn-secondary', 'Cancel');
        button_close.type = 'button';
        button_close.id = 'close_btn';
        const button_submit = el('button', 'btn btn-primary', 'Save changes');
        button_submit.type = 'submit';
        button_submit.id = 'submit_btn';
        actions.append(view_btn, button_close, button_submit);

        priceInput.value = data.price ?? '';
        qtyField.control.value = data.product_quantity ?? '';
        condField.control.value = data.condition || 'New';

        form.append(nameField.wrapper, descField.wrapper, row1, condField.wrapper, photo.field.wrapper, actions);
        body.append(header, form);
        dialog.append(body);

        const validate = () => {
            const checks = [
                [nameField, nameField.control.value.trim() ? '' : 'Enter a title.'],
                [descField, descField.control.value.trim() ? '' : 'Enter a description.'],
                [priceField, parsePrice(priceInput.value) === null ? 'Please enter a price greater than 0.' : ''],
                [qtyField, /^[1-9][0-9]{0,5}$/.test(qtyField.control.value.trim()) ? '' : 'Enter a whole number of 1 or more.'],
                [photo.field, imageFileError(photo.input.files?.[0])],
            ];
            checks.forEach(([field, message]) => setFieldError(field, message));
            const firstBad = checks.find(([, message]) => message);
            if (firstBad) {
                firstBad[0].control.focus();
                showNotification(firstBad[1], 'error');
                return false;
            }
            return true;
        };

        const save = async () => {
            if (!validate()) return;
            const price = parsePrice(priceInput.value);

            setBusy(button_submit, true, 'Saving…');

            try {
                const file = photo.input.files?.[0];
                if (file) imageURL = await uploadImage(file);
            } catch (error) {
                setFieldError(photo.field, error.message);
                showNotification(error.message, 'error');
                setBusy(button_submit, false);
                return;
            }

            const productvalues = {
                name: nameField.control.value,
                description: descField.control.value,
                price,
                condition: condField.control.value,
                image: imageURL || "",
                product_quantity: parseInt(qtyField.control.value, 10)
            };

            const saved = await this.updateProduct(productvalues, data.pid);

            if (saved) {
                this.focusAfterRender = data.pid;
                this.closeDialog();
                await this.DisplayListings();
            } else {
                setBusy(button_submit, false);
            }
        };

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            save();
        });
        button_submit.addEventListener('click', (event) => {
            // Handled here as well so it works without a real form submission.
            event.preventDefault();
            if (!button_submit.disabled) save();
        });
        button_close.addEventListener('click', () => this.closeDialog(data.pid));
        closeIcon.addEventListener('click', () => this.closeDialog(data.pid));
        dialog.addEventListener('cancel', (event) => {
            event.preventDefault();
            this.closeDialog(data.pid);
        });

        this.body.appendChild(dialog);
        dialog.showModal();
        nameField.control.focus();
    }

    // Closes without reloading. Pass a pid to return focus to that row.
    closeDialog(returnFocusPid) {
        if (!this.currentDialog) return;
        this.currentDialog.close?.();
        this.currentDialog.remove();
        this.currentDialog = null;
        if (returnFocusPid) this.focusRow(returnFocusPid);
    }

    // Kept for compatibility: closes the dialog and reloads the listings.
    async removeDialog() {
        if (this.currentDialog) {
            this.closeDialog();
            await this.DisplayListings();
        }
    }

    focusRow(pid) {
        const row = [...this.container.querySelectorAll('[data-pid]')].find((r) => r.dataset.pid === pid);
        (row?.querySelector('.edit-btn') || row?.querySelector('.delete-btn'))?.focus();
    }

    async updateProduct(newProductval, pid) {
        try {
            const result = await updateProductDetail(newProductval, pid);
            if (!result.success) throw new Error(result.error || "Failed to update listing");
            showNotification("Listing updated successfully.", 'success');
            return true;
        } catch (error) {
            console.error("Failed to update listing: ", error);
            showNotification(`Listing update failed: ${error.message}`, 'error');
            return false;
        }
    }

    async removeProduct(pid) {
        try {
            const result = await deleteProduct(pid);
            if (!result.success) throw new Error(result.error);
            await this.DisplayListings();
            showNotification("Listing deleted.", 'success');
            return true;
        } catch (error) {
            console.error("Failed to delete listing: ", error);
            showNotification(`Couldn't delete the listing: ${error.message}`, 'error');
            return false;
        }
    }

    async DisplayListings() {
        this.container.setAttribute('aria-busy', 'true');
        if (!this.container.querySelector('.product_card_list')) renderSkeletonRows(this.container);
        try {
            const result = await getproductDetail();
            if (result.success) {
                this.onListingsLoaded(result.products || []);
                if (result.products && result.products.length > 0) {
                    this.displayProducts(result.products);
                } else {
                    this.displayNoProducts();
                }
            } else {
                this.displayError();
                showNotification(`Failed to display your listings: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error("Failed to get listings for the user: ", error);
            this.displayError();
            showNotification(`Loading your listings failed: ${error.message}`, 'error');
        }
        this.container.removeAttribute('aria-busy');
    }

    displayError() {
        const retry = el('button', 'btn btn-secondary', 'Try again');
        retry.type = 'button';
        retry.addEventListener('click', () => this.DisplayListings());
        this.container.replaceChildren(createEmptyState({
            iconName: 'fa-wifi',
            title: "We couldn't load your listings",
            text: 'Check your connection and try again.',
            action: retry,
            isError: true,
        }));
    }

    displayNoProducts() {
        this.container.replaceChildren(createEmptyState({
            iconName: 'fa-box-open',
            title: "You haven't listed anything yet",
            text: 'Listings you create show up here, where you can edit or remove them.',
            action: linkButton('create_auction.html', 'Sell an item'),
        }));
    }

    displayProducts(products) {
        const rows = products.map((data) => {
            const name = data.name || 'Untitled listing';
            const isActive = data.status === "Available";

            const row = el('div', 'product_card_list');
            row.setAttribute('role', 'listitem');
            row.dataset.pid = data.pid;

            const img = el('img', 'row-thumb');
            img.loading = 'lazy';
            img.width = 80;
            img.height = 80;
            setListingImage(img, data.image, name);

            const info = el('div', 'info_product');
            const title = el('h3', 'row-title');
            const titleLink = el('a', '', name);
            linkToListing(titleLink, data);
            title.append(titleLink);

            const meta = el('p', 'row-meta');
            const status = el('span', `badge ${isActive ? 'badge-success' : ''}`, isActive ? 'Active' : (data.status || 'Inactive'));
            meta.append(status);
            if (data.condition) meta.append(el('span', '', conditionLabel(data.condition)));
            if (data.product_quantity) meta.append(el('span', '', `Qty ${data.product_quantity}`));

            info.append(title, meta);

            const price = el('p', 'row-price', priceText(data.price));

            const actions = el('div', 'row-actions');
            if (isActive) {
                const edit_btn = el('button', 'btn btn-secondary btn-sm edit-btn');
                edit_btn.type = 'button';
                edit_btn.append(icon('fa-pen'), ' Edit');
                edit_btn.setAttribute('aria-label', `Edit ${name}`);
                edit_btn.addEventListener('click', () => this.openDialogBox(data));
                actions.append(edit_btn);
            }

            const delete_btn = el('button', 'btn btn-danger-outline btn-sm delete-btn');
            delete_btn.type = 'button';
            delete_btn.append(icon('fa-trash-can'), ' Remove');
            delete_btn.setAttribute('aria-label', `Remove ${name}`);
            delete_btn.addEventListener('click', () => this.removeProductDialog(data.pid, name));
            actions.append(delete_btn);

            row.append(img, info, price, actions);
            return row;
        });

        this.container.replaceChildren(...rows);

        if (this.focusAfterRender) {
            this.focusRow(this.focusAfterRender);
            this.focusAfterRender = null;
        }
    }

    removeProductDialog(pid, name = 'this listing') {
        const dialog = el('dialog', 'delete_dialog');
        dialog.setAttribute('role', 'alertdialog');
        dialog.setAttribute('aria-labelledby', 'delete-dialog-title');
        dialog.setAttribute('aria-describedby', 'delete-dialog-text');

        const body = el('div', 'dialog-body');
        const badge = el('span', 'dialog-icon');
        badge.append(icon('fa-trash-can'));
        const heading = el('h2', '', 'Remove this listing?');
        heading.id = 'delete-dialog-title';
        const text = el('p', 'muted', `“${name}” will be removed from UnivBid. This can't be undone.`);
        text.id = 'delete-dialog-text';

        const actions = el('div', 'form-actions button_div');
        const button_no = el('button', 'btn btn-secondary no_button', 'Cancel');
        button_no.type = 'button';
        const button_yes = el('button', 'btn btn-danger yes_button', 'Remove listing');
        button_yes.type = 'button';
        actions.append(button_no, button_yes);

        body.append(badge, heading, text, actions);
        dialog.append(body);
        this.body.appendChild(dialog);
        dialog.showModal();
        button_no.focus();

        const close = () => {
            dialog.close?.();
            dialog.remove();
            this.focusRow(pid);
        };

        button_yes.addEventListener("click", async () => {
            setBusy(button_yes, true, 'Removing…');
            button_no.disabled = true;
            const removed = await this.removeProduct(pid);
            dialog.close?.();
            dialog.remove();
            if (removed) document.getElementById('listings-heading')?.focus();
            else this.focusRow(pid);
        });

        button_no.addEventListener("click", close);
        dialog.addEventListener('cancel', (event) => {
            event.preventDefault();
            close();
        });
    }
}

export class getallProducts {
    constructor(container) {
        this.container = container;
        this.cursor = null;
        this.userID = null;
        this.loadMoreButton = el('button', 'load_more_btn btn btn-secondary btn-lg', 'Load more listings');
        this.loadMoreButton.type = 'button';
        this.loadMoreButton.hidden = true;
        this.loadMoreButton.addEventListener("click", () => this.loadNextPage());
        this.container.after(this.loadMoreButton);
        this.setup();
    }

    setup() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                await this.fetchAllproducts(user.uid);
            } else {
                showNotification("Please sign in to browse listings.");
                window.location.href = signInUrl();
            }
        });
    }

    async fetchAllproducts(userID) {
        this.userID = userID;
        this.cursor = null;
        // Skeletons stay until the first page arrives.
        if (!this.container.querySelector('.skeleton-card')) renderSkeletonCards(this.container);
        await this.loadNextPage(true);
    }

    // Keeps fetching while a page held only the viewer's own listings, so a
    // click never adds nothing while more listings exist.
    async loadNextPage(reset = false) {
        this.loadMoreButton.disabled = true;
        this.loadMoreButton.setAttribute('aria-busy', 'true');
        this.container.setAttribute('aria-busy', 'true');

        try {
            let result;
            let shown = 0;
            let cleared = !reset;
            do {
                result = await fetchProducts(this.userID, this.cursor);
                if (!result.success) {
                    if (!cleared || !this.container.querySelector(".product_card")) this.displayError();
                    showNotification(`Failed to display products: ${result.error}`, 'error');
                    this.finishLoading();
                    return;
                }
                if (!cleared) {
                    this.container.replaceChildren();
                    cleared = true;
                }
                this.cursor = result.cursor;
                this.displayallProducts(result.products);
                shown += result.products.length;
            } while (shown === 0 && result.hasMore);

            if (!this.container.querySelector(".product_card")) {
                this.displayEmpty();
            }
            this.loadMoreButton.hidden = !result.hasMore;
        } catch (error) {
            console.error("Failed to fetch products: ", error);
            if (!this.container.querySelector(".product_card")) this.displayError();
            showNotification("Loading listings failed. Please try again.", 'error');
        }

        this.finishLoading();
    }

    finishLoading() {
        this.loadMoreButton.disabled = false;
        this.loadMoreButton.removeAttribute('aria-busy');
        this.container.removeAttribute('aria-busy');
    }

    displayEmpty() {
        this.container.replaceChildren(createEmptyState({
            iconName: 'fa-store',
            title: 'No listings yet',
            text: "Nothing from other students is for sale right now. Check back soon, or list something yourself.",
            action: linkButton('create_auction.html', 'Sell an item'),
        }));
    }

    displayError() {
        const retry = el('button', 'btn btn-secondary', 'Try again');
        retry.type = 'button';
        retry.addEventListener('click', () => this.fetchAllproducts(this.userID));
        this.container.replaceChildren(createEmptyState({
            iconName: 'fa-wifi',
            title: "We couldn't load listings",
            text: 'Check your connection and try again.',
            action: retry,
            isError: true,
        }));
    }

    displayallProducts(products) {
        products.forEach(data => {
            const name = data.name || 'Untitled listing';
            const card = el('article', 'product_card');

            const media = el('div', 'card-media');
            const img = el('img');
            img.loading = 'lazy';
            img.decoding = 'async';
            img.width = 400;
            img.height = 300;
            setListingImage(img, data.image, name);
            media.append(img);

            const body = el('div', 'card-body');

            const title = el('h3', 'card-title');
            const link = el('a', 'card-link', name);
            linkToListing(link, data);
            title.append(link);

            const price = el('p', 'card-price', priceText(data.price));

            const meta = el('p', 'card-meta');
            if (data.condition) meta.append(el('span', 'badge', conditionLabel(data.condition)));
            const category = categoryLabel(data.categories);
            if (category) meta.append(el('span', 'small muted', category));

            const seller = el('p', 'card-seller', `Listed by ${data.soldBy_name || 'a student'}`);

            body.append(title, price, meta, seller);
            card.append(media, body);
            this.container.appendChild(card);
        });
    }
}
