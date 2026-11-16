import { ProfilePicture, profileLoad } from '../components/AuthModal.js';
import { createField, makeInput } from '../components/form.js';
import { el, icon } from '../components/listingMeta.js';

document.addEventListener("DOMContentLoaded", function () {
    new ProfilePicture(document.getElementById("profile_pic"));

    const host = document.getElementById("profile-root") || document.querySelector("main") || document.body;

    const layout = el('div', 'profile-layout card_container');

    // Summary card with the avatar and shortcuts
    const aside = el('aside', 'card profile-summary card_column');
    aside.setAttribute('aria-label', 'Profile summary');
    const avatar = el('img', 'profile-avatar card_profile_pic');
    avatar.src = 'Images/11.png';
    avatar.alt = 'Your profile picture';
    avatar.width = 96;
    avatar.height = 96;
    const links = el('ul', 'nav-list profile-links');
    [
        ['dashboard.html', 'fa-chart-line', 'Your dashboard'],
        ['create_auction.html', 'fa-plus', 'Sell an item'],
        ['shopping_list.html', 'fa-bookmark', 'Saved items'],
    ].forEach(([href, iconName, text]) => {
        const li = el('li');
        const a = el('a');
        a.href = href;
        a.append(icon(iconName), text);
        li.append(a);
        links.append(li);
    });
    aside.append(avatar, links);

    // Form
    const card = el('div', 'card card_profile');
    const form = el('form', 'form-section');
    form.id = "profile-edit-form";
    form.noValidate = true;

    const formTitle = el('h2', '', 'General information');

    const first = createField({ id: 'first-name', label: 'First name', control: makeInput('text', { name: 'first-name', autocomplete: 'given-name' }) });
    const last = createField({ id: 'last-name', label: 'Last name', control: makeInput('text', { name: 'last-name', autocomplete: 'family-name' }) });
    const nameRow = el('div', 'form-row flex-container');
    nameRow.append(first.wrapper, last.wrapper);

    const email = createField({
        id: 'email', label: 'Contact email',
        hint: "This doesn't change the email you sign in with.",
        control: makeInput('email', { name: 'email', autocomplete: 'email' }),
    });
    const phone = createField({ id: 'phone', label: 'Phone number', optional: true, control: makeInput('tel', { name: 'phone', autocomplete: 'tel' }) });
    const university = createField({ id: 'university', label: 'University', optional: true, control: makeInput('text', { name: 'university', autocomplete: 'organization' }) });

    // Contact preferences
    const choices = el('fieldset', 'choice_block');
    choices.append(el('legend', '', 'How buyers can contact you'));
    choices.append(el('p', 'field-hint', 'Saved to your profile for when seller messaging is switched on.'));
    const makeCheck = (id, text) => {
        const label = el('label', 'check');
        const box = el('input');
        box.type = 'checkbox';
        box.id = id;
        label.htmlFor = id;
        label.append(box, el('span', '', text));
        choices.append(label);
        return box;
    };
    const check_box_email = makeCheck('check_box_email', 'Email');
    const check_box_phone = makeCheck('check_box_phone', 'Phone');

    const actions = el('div', 'form-actions');
    const submitButton = el('button', 'btn btn-primary btn-lg', 'Save profile');
    submitButton.type = "submit";
    actions.append(submitButton);

    form.append(formTitle, nameRow, email.wrapper, phone.wrapper, university.wrapper, choices, actions);
    card.append(form);
    layout.append(aside, card);
    host.append(layout);

    new profileLoad(first.control, last.control, phone.control, email.control, university.control,
        check_box_email, check_box_phone, submitButton, avatar);

    // ProfilePicture fills the header avatar; mirror it here when it loads.
    const headerAvatar = document.getElementById("profile_pic");
    if (headerAvatar && window.MutationObserver) {
        new window.MutationObserver(() => {
            if (headerAvatar.src && !headerAvatar.src.endsWith('Images/11.png')) avatar.src = headerAvatar.src;
        }).observe(headerAvatar, { attributes: true, attributeFilter: ['src'] });
    }
});
