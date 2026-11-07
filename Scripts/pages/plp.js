import { showNotification } from '../services/notifications.js';
import { formatPrice } from '../services/price.js';

document.addEventListener("DOMContentLoaded", () => {
    const selected_product = sessionStorage.getItem("selected_item");
    const body = document.body;


    if (selected_product) {
        const product = JSON.parse(selected_product);
        const left_container = document.querySelector(".left_container");


        // const return_cta = document.getElementById("return");
        // return_cta.addEventListener("click", () => {
        //     window.location.href = "sales_page.html";
        // });



        const image_div = document.createElement("div");
        image_div.classList.add("image_div");
        const image_ = document.createElement("img");
        image_.src = product.image || "../Images/13.png";
        image_.alt = product.name;
        image_div.appendChild(image_);

        left_container.appendChild(image_div);


        const right_container = document.querySelector(".right_container");

        const product_listing = document.createElement("div");
        product_listing.classList.add("product_listing");

        const product_name = document.createElement("h1");
        product_name.innerText = product.name;

        const price = document.createElement("h4");
        price.id = "price";
        price.textContent = `€  ${formatPrice(product.price)}`;

        const description_div = document.createElement("div");
        description_div.classList.add("description_div");

        const description_label = document.createElement("h4");
        description_label.innerText = "DESCRIPTION";

        const product_desc = document.createElement("p");
        product_desc.innerText = product.description;

        const seller = document.createElement("p");
        seller.textContent = ` Sold By: ${product.soldBy_name || "Unknown Seller"}`;

        const status_label = document.createElement("p");
        status_label.innerText = "Condition: ";

        const listing_rank = document.createElement("span");
        let stars = 0;

        switch (product.condition) {
            case ("New"):
                stars = 5;
                break;
            case ("Like New"):
                stars = 4;
                break;
            case ("Fairly Good"):
                stars = 3;
                break;
            case ("Used"):
                stars = 2;
                break;
            case ("Heavily Used"):
                stars = 1;
                break;
            default:
                stars = 0

        };

        for (let i = 0; i < 5; i++) {
            const icon = document.createElement("i");
            icon.classList.add("far", "fa-star");
            if (i < stars) {
                icon.classList.add("fas", "fa-star");
                icon.style.color = "#e7b33f";
            }
            listing_rank.appendChild(icon);
        }

        listing_rank.title = product.condition;
        status_label.appendChild(listing_rank);

        const qty = document.createElement("p");
        qty.id = "Qunatity";
        qty.textContent = ` Qty: ${product.product_quantity}`;

        const qty_label = document.createElement("label");
        qty_label.innerText = "Qty: ";
        const qty_input = document.createElement("input");
        qty_input.type = "number";
        qty_input.min = 1;
        qty_input.max = Number(product.product_quantity);
        qty_input.value = 1;
        qty_input.classList.add("qty_input");

        qty_label.appendChild(qty_input);

        const button_CTA_div = document.createElement("div");
        button_CTA_div.classList.add("button_cta_div");

        const button_addtocart = document.createElement("button");
        button_addtocart.classList.add("CTA_button");
        button_addtocart.id = "addtocart";
        button_addtocart.innerText = "ADD TO CART";

        const button_buynow = document.createElement("button");
        button_buynow.classList.add("CTA_button");
        button_buynow.id = "buynow";
        button_buynow.innerText = "BUY NOW";

        button_CTA_div.append(qty_label, button_addtocart, button_buynow);
        description_div.append(description_label, status_label, product_desc, button_CTA_div);

        product_listing.append(product_name, price, description_div);

        button_addtocart.addEventListener("click", () => {
            const cart = JSON.parse(localStorage.getItem("cart")) || [];
            const existing = cart.find(item => item.pid === product.pid);

            if (existing) {
                if (existing.quantity < product.product_quantity) {
                    existing.quantity += 1;
                } else {
                   showNotification("Maximum quantity reached.");
                    return;
                }
            } else {
                cart.push({ ...product, quantity: 1 });
            }

            localStorage.setItem("cart", JSON.stringify(cart));
            showNotification("Product added to cart!",'success');
        });



        button_buynow.addEventListener("click", () => {
            const total_price = parseFloat(qty_input.value * Number(product.price)).toFixed(2);
            const buyNowItem = {
                product: selected_product,
                total_price: total_price
            };
            sessionStorage.setItem("buy_now_item", JSON.stringify(buyNowItem));
            window.location.href = "checkout.html";
        });


        right_container.appendChild(product_listing);
        body.appendChild(right_container);
    } else {
        const emptyState = document.getElementById("empty-listing-state");
        if (emptyState) emptyState.hidden = false;
        document.querySelector(".left_container")?.setAttribute("hidden", "");
        document.querySelector(".right_container")?.setAttribute("hidden", "");
    }




});