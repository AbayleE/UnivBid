import { ProfilePicture, profileLoad } from '../components/AuthModal.js';
import { createField, makeInput } from '../components/form.js';
import { el, icon } from '../components/listingMeta.js';
import { updateuserProfile } from '../services/api.js';
import { showNotification } from '../services/notifications.js';

document.addEventListener("DOMContentLoaded", function () {
    new ProfilePicture(document.getElementById("profile_pic"));

    const host = document.getElementById("profile-root") || document.querySelector("main") || document.body;

    const layout = el('div', 'profile-layout');

    // ---------- Sidebar: identity card + shortcuts ----------
    const aside = el('aside', 'card profile-summary');
    aside.setAttribute('aria-label', 'Profile summary');

    const identity = el('div', 'profile-identity');
    const avatar = el('img', 'profile-avatar');
    avatar.src = 'Images/11.png';
    avatar.alt = 'Your profile picture';
    avatar.width = 64;
    avatar.height = 64;
    const meta = el('div', 'profile-meta');
    const displayName = el('p', 'profile-name', 'Your account');
    const displayEmail = el('p', 'profile-email', '');
    meta.append(displayName, displayEmail);
    const changeAvatar = el('button', 'btn btn-secondary btn-sm profile-avatar-btn');
    changeAvatar.type = 'button';
    changeAvatar.append(icon('fa-arrows-rotate'), 'Change avatar');
    identity.append(avatar, meta, changeAvatar);

    const linksNav = el('nav', 'profile-nav');
    linksNav.setAttribute('aria-labelledby', 'profile-nav-title');
    const navTitle = el('p', 'profile-nav-title', 'Shortcuts');
    navTitle.id = 'profile-nav-title';
    const links = el('ul', 'nav-list profile-links');
    [
        ['dashboard.html', 'fa-chart-line', 'Your dashboard'],
        ['create_auction.html', 'fa-plus', 'Sell an item'],
        ['shopping_list.html', 'fa-bookmark', 'Saved items'],
    ].forEach(([href, iconName, text]) => {
        const li = el('li');
        const a = el('a');
        a.href = href;
        a.append(icon(iconName), el('span', '', text), icon('fa-chevron-right'));
        li.append(a);
        links.append(li);
    });
    linksNav.append(navTitle, links);
    aside.append(identity, linksNav);

    // Avatars are generated images; "Change avatar" saves a fresh one.
    changeAvatar.addEventListener('click', async () => {
        const seed = (crypto.randomUUID?.() || String(Date.now() + Math.random())).slice(0, 12);
        const url = `https://robohash.org/${encodeURIComponent(seed)}.png?size=200x200`;
        changeAvatar.disabled = true;
        changeAvatar.setAttribute('aria-busy', 'true');
        const result = await updateuserProfile({ avatar: url });
        if (result.success) {
            avatar.src = url;
            const headerPic = document.getElementById("profile_pic");
            if (headerPic) headerPic.src = url;
            showNotification("Avatar updated.", 'success');
        } else {
            showNotification(`Couldn't update your avatar: ${result.error}`, 'error');
        }
        changeAvatar.disabled = false;
        changeAvatar.removeAttribute('aria-busy');
    });

    // ---------- Settings card ----------
    const card = el('div', 'card card_profile');
    const form = el('form', 'profile-form');
    form.id = "profile-edit-form";
    form.noValidate = true;

    const cardHead = el('div', 'profile-card-head');
    cardHead.append(
        el('h2', '', 'General information'),
        el('p', '', 'This is what buyers see when they contact you about a listing.'),
    );

    const section = (title) => {
        const wrap = el('section', 'profile-section');
        const heading = el('h3', 'profile-section-title', title);
        wrap.append(heading);
        return wrap;
    };
    const row = (...fields) => {
        const r = el('div', 'form-row');
        r.append(...fields.map(f => f.wrapper));
        return r;
    };

    const first = createField({ id: 'first-name', label: 'First name', control: makeInput('text', { name: 'first-name', autocomplete: 'given-name' }) });
    const last = createField({ id: 'last-name', label: 'Last name', control: makeInput('text', { name: 'last-name', autocomplete: 'family-name' }) });
    const university = createField({ id: 'university', label: 'University', optional: true, control: makeInput('text', { name: 'university', autocomplete: 'organization' }) });
    const email = createField({
        id: 'email', label: 'Contact email',
        hint: "Doesn't change the email you sign in with.",
        control: makeInput('email', { name: 'email', autocomplete: 'email' }),
    });
    const phone = createField({ id: 'phone', label: 'Phone number', optional: true, control: makeInput('tel', { name: 'phone', autocomplete: 'tel' }) });

    const personal = section('Personal details');
    personal.append(row(first, last), university.wrapper);

    const contact = section('Contact details');
    contact.append(row(email, phone));

    // Contact preferences
    const choices = el('fieldset', 'choice_block');
    choices.append(el('legend', '', 'How buyers can contact you'));
    choices.append(el('p', 'field-hint', 'Saved to your profile for when seller messaging is switched on.'));
    const checkGroup = el('div', 'choice_options');
    choices.append(checkGroup);
    const makeCheck = (id, text, iconName) => {
        const label = el('label', 'check choice_pill');
        const box = el('input');
        box.type = 'checkbox';
        box.id = id;
        label.htmlFor = id;
        label.append(box, icon(iconName), el('span', '', text));
        checkGroup.append(label);
        return box;
    };
    const check_box_email = makeCheck('check_box_email', 'Email', 'fa-envelope');
    const check_box_phone = makeCheck('check_box_phone', 'Phone', 'fa-phone');
    contact.append(choices);

    const actions = el('div', 'form-actions');
    const submitButton = el('button', 'btn btn-primary btn-lg', 'Save profile');
    submitButton.type = "submit";
    actions.append(submitButton);

    form.append(cardHead, personal, contact, actions);
    card.append(form);
    layout.append(aside, card);
    host.append(layout);

    // Keep the sidebar's name and email in step with the form.
    const syncIdentity = () => {
        const name = `${first.control.value} ${last.control.value}`.trim();
        displayName.textContent = name || 'Your account';
        displayEmail.textContent = email.control.value.trim();
        displayEmail.hidden = !displayEmail.textContent;
    };
    [first.control, last.control, email.control].forEach(c => c.addEventListener('input', syncIdentity));
    syncIdentity();

    const loader = new profileLoad(first.control, last.control, phone.control, email.control, university.control,
        check_box_email, check_box_phone, submitButton, avatar);
    const populate = loader.populateform.bind(loader);
    loader.populateform = (data) => { populate(data); syncIdentity(); };

    // ProfilePicture fills the header avatar; mirror it here when it loads.
    const headerAvatar = document.getElementById("profile_pic");
    if (headerAvatar && window.MutationObserver) {
        new window.MutationObserver(() => {
            if (headerAvatar.src && !headerAvatar.src.endsWith('Images/11.png')) avatar.src = headerAvatar.src;
        }).observe(headerAvatar, { attributes: true, attributeFilter: ['src'] });
    }
});
