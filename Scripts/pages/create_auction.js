import { createListing } from '../components/ProductCard.js';
import { imageUpload } from '../components/ProductCard.js';
import { showNotification } from '../services/notifications.js';
import { parsePrice } from '../services/price.js';
document.addEventListener("DOMContentLoaded", async function () {
    const body = document.body;

    const body_right = document.createElement("div");
    body_right.classList.add("body_right");

    const return_link = document.createElement("a");
    return_link.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Listings';
    return_link.classList.add("return_link");

    return_link.addEventListener("click", function () {
        window.location.href = "sales_page.html";
    })


    body_right.appendChild(return_link);
    const header_container = document.createElement("div");
    header_container.classList.add("header_container");
    const title = document.createElement("h1");
    title.innerText = "Create New Auction";
    const subtitle = document.createElement("p");
    subtitle.innerText = "List your Item and start receiving bids from fellow students";

    header_container.append(title, subtitle);
    body_right.appendChild(header_container);

    const input_container = document.createElement("div");
    input_container.classList.add("input_container");

    const title_div = document.createElement("div");
    const title_container = document.createElement("h3");
    title_container.innerText = "Basic Information";
    const subtitle_container = document.createElement("p");
    subtitle_container.innerText = "Tell buyers about your item";

    title_div.append(title_container, subtitle_container);



    const product_name_cont = document.createElement("div");
    product_name_cont.classList.add("add_product_input_cont");
    const product_name_label = document.createElement("label");
    product_name_label.innerText = "Item Title * "
    const product_name = document.createElement("input");
    product_name.id = "product_name";
    product_name.required = true;
    product_name.placeholder = "e.g. MacBook Pro 2023 - Excellent Condition";
    product_name_cont.append(product_name_label, product_name);


    const product_desc_cont = document.createElement("div");
    product_desc_cont.classList.add("add_product_input_cont", "fullwidth");
    const product_desc_label = document.createElement("label");
    product_desc_label.innerText = "Description * "
    const product_description = document.createElement("textarea");
    product_description.id = "product_description";
    product_description.required = true;
    product_description.placeholder = "Describe your item in detail. Include Condition, usage, included accessories, etc...";
    product_desc_cont.append(product_desc_label, product_description);


    const product_price_cont = document.createElement("div");
    product_price_cont.classList.add("add_product_input_cont");
    const product_price_label = document.createElement("label");
    product_price_label.innerText = "Starting Bid * "
    const product_price = document.createElement("input");
    product_price.id = "product_price";
    product_price.type = "number";
    product_price.placeholder = "$ 0.00";
    product_price.required = true;
    product_price_cont.append(product_price_label, product_price);

    const category_cont = document.createElement("div");
    category_cont.classList.add("add_product_input_cont");
    const category_label = document.createElement("label");
    category_label.innerText = "Category * "
    const category_select = document.createElement("select");
    category_select.id = "category";
    category_select.required = true;
    const categories = [
        "Electronics",
        "Fashion",
        "Books",
        "Home & Kitchen",
        "Sports & Outdoors",
        "Toys & Games",
        "Health & Beauty",
        "Automotive",
        "Art & Collectibles",
        "Other"
    ];

    categories.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat.toLowerCase().replace(/ & /g, "-").replace(/\s+/g, "-");
        option.innerText = cat;
        category_select.appendChild(option);
    });

    category_cont.append(category_label, category_select);

    const row_div = document.createElement("div");
    row_div.classList.add('row_div');

    const product_quantity_cont = document.createElement("div");
    product_quantity_cont.classList.add("add_product_input_cont");
    const product_quantity_label = document.createElement("label");
    product_quantity_label.innerText = "Product Quantity * "
    const product_quantity = document.createElement("input");
    product_quantity.id = "product_quantity";
    product_quantity.type = "number";
    product_quantity.required = true;
    product_quantity_cont.append(product_quantity_label, product_quantity);

    const product_cond_cont = document.createElement("div");
    product_cond_cont.classList.add("add_product_input_cont");
    const condition_label = document.createElement("label");
    condition_label.innerText = "Condition *";
    const condition_labels = document.createElement("select");
    condition_labels.required = true;

    const new_options = document.createElement("option");
    new_options.value = "New";
    new_options.innerText = "New";

    const good_options = document.createElement("option");
    good_options.value = "Fairly Good";
    good_options.innerText = "Fairly Good";

    const used_options = document.createElement("option");
    used_options.value = "Used";
    used_options.innerText = "Used";

    const like_new = document.createElement("option");
    like_new.value = "Like New";
    like_new.innerText = "Like New";

    const heavily_used = document.createElement("option");
    heavily_used.value = "Heavily Used";
    heavily_used.innerText = "Heavily Used";

    condition_labels.append(new_options, like_new, good_options, used_options, heavily_used);
    product_cond_cont.append(condition_label, condition_labels);

    const product_image_cont = document.createElement("div");
    product_image_cont.classList.add("add_product_input_cont");

    const product_image_label = document.createElement("label");
    product_image_label.innerText = "Product Image: ";

    const product_image = document.createElement("input");
    product_image.type = "file";
    product_image.accept = "image/*";
    product_image.id = "product_image";
    product_image.required = true;
    const file = product_image.files[0];

    // product_image.addEventListener("change", async function () {
    //     let imageURL = new imageUpload(file, imageURL);
    //     console.log(imageURL);
    // });

    product_image_cont.append(product_image_label, product_image);



    row_div.append(product_quantity_cont, product_cond_cont)

    input_container.append(title_div, product_name_cont, product_desc_cont, product_price_cont, row_div, category_cont, product_image_cont);

    const auction_setting = document.createElement("div");
    auction_setting.classList.add("input_container");

    const auction_title_div = document.createElement("div");
    const auction_title = document.createElement("h3");
    auction_title.innerText = "Auction Settings";
    const auction_subtitle = document.createElement("p");
    auction_subtitle.innerText = "Set your starting price and auction duration";
    auction_title_div.append(auction_title, auction_subtitle);

    const auction_deadline_cont = document.createElement("div");
    auction_deadline_cont.classList.add("add_product_input_cont");
    const auction_deadline_label = document.createElement("label");
    auction_deadline_label.innerText = "End Date * ";
    const auction_deadline = document.createElement("input");
    auction_deadline.id = "auction_deadline";
    auction_deadline.required = true;
    auction_deadline.type = "date";
    auction_deadline_cont.append(auction_deadline_label, auction_deadline);

    auction_setting.append(auction_title_div, product_price_cont, auction_deadline_cont);


    body_right.appendChild(input_container);
    body_right.appendChild(auction_setting);

    const terms_container = document.createElement("div");
    terms_container.classList.add("terms_container");

    const terms_container_title = document.createElement("h3");
    terms_container_title.innerText = "Before you list your item: ";

    const terms_list = document.createElement("ul");
    const terms_list_value = [
        "Ensure your iterm description is accurate and complete",
        "Take cleaar, well-lit photos from multiple angles",
        "Set a reasonable starting price",
        "Be available for pickup arramgements",
        "Follow university guidelines for student transactions"
    ];

    terms_list_value.forEach((terms, indx) => {
        const list = document.createElement("li");
        list.innerHTML = `<i class="fa-solid fa-check"></i> &nbsp; ${terms_list_value[indx]}`;
        terms_list.appendChild(list);
    }
    );

    const agreement_div = document.createElement("div");

    const agreement_checkbox = document.createElement("input");
    agreement_checkbox.type = "checkbox";
    agreement_checkbox.id = "agreementCheckbox";
    agreement_checkbox.required;

    const agreement_label = document.createElement("label");
    agreement_label.htmlFor = "agreementCheckbox";
    agreement_label.innerHTML = "I agree to the <u>Terms of Service</u> and <u> Community Guidelines</u>";


    agreement_div.appendChild(agreement_checkbox);
    agreement_div.appendChild(agreement_label);


    terms_container.append(terms_container_title, terms_list, agreement_div);
    body_right.append(terms_container);

    const button_div = document.createElement("div");
    button_div.classList.add("button_div");

    const button_create_auction = document.createElement("button");
    button_create_auction.innerText = "Create Auction";
    button_create_auction.id = "submit_btn";

    button_div.appendChild(button_create_auction);
    body_right.appendChild(button_div);

    button_create_auction.addEventListener("click", () => {
        const required_fields = [
            product_name,
            product_description,
            product_price,
            condition_labels,
            product_quantity,
            category_select,
            auction_deadline,
            agreement_checkbox
        ];

        const invalid_fields = required_fields.filter(input=> {
            return !input.value || (input.tagName === 'SELECT' && input.selectedIndex === -1);
        });

        if(invalid_fields.length > 0){
            showNotification("Please fill in all required fields.",'error')
            return;
        }
        const price = parsePrice(product_price.value);
        if (price === null) {
            showNotification("Please enter a price greater than 0.", 'error');
            return;
        }

        const productvalues = {
            name: product_name.value,
            description: product_description.value,
            price,
            condition: condition_labels.value,
            image: "",
            product_quantity: product_quantity.value,
            categories: category_select.value,
            auction_deadline: auction_deadline.value
        }
        new createListing(productvalues);
    })

    body.appendChild(body_right);



});