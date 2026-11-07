import { ProfilePicture, profileLoad } from '../components/AuthModal.js';
import { logoutuser } from '../services/auth.js';
import { showNotification } from '../services/notifications.js';
document.addEventListener("DOMContentLoaded", function () {

    const body = document.body;

    new ProfilePicture(document.getElementById("profile_pic"));

    document.getElementById("add_product_btn").addEventListener("click", function () {
        window.location.href = "create_auction.html";
    });


    const content_left = document.createElement("div");
    content_left.classList.add("body_left");

    const pages_container = document.createElement("div");
    pages_container.classList.add("pages_container");

    const pages = ["Home","My Dashboard", "Browse Listings", "Contact", "Account", "Sign Out"];
    const page_link = ["index.html","dashboard.html", "sales_page.html", "contact.html", "profile.html", "index.html"];
    const icons = ["fa-house","fa-chart-line", "fa-store", "fa-headset", "fa-user", "fa-sign-out"];


    pages.forEach((page, indx) => {
        const links = document.createElement('a');
        links.href = page_link[indx];
        if (page === "Sign Out") {
            links.addEventListener("click", async (event) => {
                event.preventDefault();
                const result = await logoutuser();
                if (result.error) {
                    showNotification(`Sign out failed: ${result.error}`, "error");
                    return;
                }
                window.location.href = "index.html";
            });
        }

        const icon = document.createElement("i");
        icon.classList.add("fa-solid", icons[indx]);

        const span_text = document.createElement("span");
        span_text.textContent = " " + page;
       

        links.appendChild(icon);
        links.appendChild(span_text);
        pages_container.appendChild(links);

    });

    content_left.appendChild(pages_container);
    body.appendChild(content_left);

    // Content-Right

    const content_right = document.createElement("div");
    content_right.classList.add("content_right");

    const header_profile = document.createElement("div");
    header_profile.classList.add("header_profile");

    const header_profile_title = document.createElement("h4");
    header_profile_title.classList.add("header_profile_title");
    header_profile_title.innerText = " User Profile";

    const header_profile_sub_title = document.createElement("p");
    header_profile_sub_title.classList.add("header_profile_sub_title");
    header_profile_sub_title.innerHTML = 'Manage your profile, update your information, and track your activity on <span style="color:red">UnivBid</span>.';

    header_profile_title.appendChild(header_profile_sub_title);
    header_profile.appendChild(header_profile_title);
    content_right.appendChild(header_profile);

    // Profile Container

    const card_container = document.createElement("div");
    card_container.classList.add("card_container");

    const card_column = document.createElement("div");
    card_column.classList.add("card_column");

    const card_profile_left = document.createElement("div");
    card_profile_left.classList.add("card_block");

    const card_profile_pic = document.createElement("div");
    card_profile_pic.classList.add("card_profile_pic");
    card_profile_left.appendChild(card_profile_pic);

    const card_contact_activity = document.createElement("div");
    card_contact_activity.classList.add("card_block");

    const header_card_contact_activity = document.createElement("h2");
    header_card_contact_activity.innerText = "Contact Details";

    card_contact_activity.appendChild(header_card_contact_activity);
    const contact_choice = document.createElement("div");
    contact_choice.classList.add("choice_block");
    
    const check_box_email = document.createElement("input");
    check_box_email.type = "checkbox";
    check_box_email.id = "check_box_email";
    
    const label_email = document.createElement("label");
    label_email.setAttribute("for", "check_box_email");
    label_email.innerText = "Email";
    
    const check_box_phone = document.createElement("input");
    check_box_phone.type = "checkbox";
    check_box_phone.id = "check_box_phone";
    
    const label_phone = document.createElement("label");
    label_phone.setAttribute("for", "check_box_phone");
    label_phone.innerText = "Phone";
    
    contact_choice.append(check_box_email, label_email, check_box_phone, label_phone);
    card_contact_activity.appendChild(contact_choice);
    
    card_column.appendChild(card_profile_left);
    card_column.appendChild(card_contact_activity);

    const profile_info_div = document.createElement("div");
    profile_info_div.classList.add("card_profile");

    const profile_info_header_profile = document.createElement("h2");
    profile_info_header_profile.innerText = "General Information";
    profile_info_header_profile.style.paddingTop = "10px";

    profile_info_div.appendChild(profile_info_header_profile);

    const form = document.createElement("form");
    form.id = "profile-edit-form";

    const name_container = document.createElement("div");
    name_container.classList.add("flex-container");

    const firstName_container = document.createElement("div");
    firstName_container.classList.add("input-container");
    const firstname_label = document.createElement("label");
    firstname_label.setAttribute("for", "first-name");
    firstname_label.innerText = "First Name:";
    const firstNameinput = document.createElement("input");
    firstNameinput.type = "text";
    firstNameinput.id = "first-name";
    firstNameinput.name = "first-name";
    firstNameinput.required = true;

    firstName_container.append(firstname_label, firstNameinput);

    const lastName_container = document.createElement("div");
    lastName_container.classList.add("input-container");
    const lastname_label = document.createElement("label");
    lastname_label.setAttribute("for", "last-name");
    lastname_label.innerText = "Last Name:";
    const lastNameinput = document.createElement("input");
    lastNameinput.type = "text";
    lastNameinput.id = "last-name";
    lastNameinput.name = "last-name";
    lastNameinput.required = true;

    lastName_container.append(lastname_label, lastNameinput);
    name_container.append(firstName_container, lastName_container);

    const email_container = document.createElement("div");
    email_container.classList.add("input-container", "full_container");
    const email_label = document.createElement("label");
    email_label.setAttribute("for", "email");
    email_label.innerText = "Email:";
    const emailinput = document.createElement("input");
    emailinput.type = "email";
    emailinput.name = "email";
    emailinput.id = "email";
    emailinput.required = true;

    email_container.append(email_label, emailinput);

    const phone_container = document.createElement("div");
    phone_container.classList.add("input-container", "full_container");
    const phone_label = document.createElement("label");
    phone_label.setAttribute("for", "phone");
    phone_label.innerText = "Phone number:";
    const phoneinput = document.createElement("input");
    phoneinput.type = "tel";
    phoneinput.id = "phone";
    phoneinput.name = "phone";

    phone_container.append(phone_label, phoneinput);


    const university_container = document.createElement("div");
    university_container.classList.add("input-container", "full_container");
    const university_label = document.createElement("label");
    university_label.setAttribute("for", "university");
    university_label.innerHTML = "University:";
    const universityinput = document.createElement("input");
    universityinput.type = "text";
    universityinput.id = "university";
    universityinput.name = "university";

    university_container.append(university_label, universityinput);

    const submit_container = document.createElement("div");
    submit_container.classList.add("full_container");
    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.innerText = "Update Profile";

    submit_container.append(submitButton);

    form.append(name_container, email_container, phone_container, university_container);
    profile_info_div.appendChild(form);
    profile_info_div.appendChild( submit_container);


    card_container.appendChild(card_column);
    card_container.appendChild(profile_info_div);
  


    content_right.appendChild(card_container);
    body.appendChild(content_right);

    const profile_edit_form = document.querySelector(".card_profile form");
    const firstNameInput = document.getElementById("first-name");
    const lastNameInput = document.getElementById("last-name");
    const phoneInput = document.getElementById("phone");
    const emailInput = document.getElementById("email");
    const uniInput = document.getElementById("university");

    new profileLoad(firstNameInput,lastNameInput,phoneInput,emailInput,uniInput,check_box_email,check_box_phone,submitButton,card_profile_pic);
});
