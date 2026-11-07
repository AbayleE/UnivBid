import { Loaduserslistings } from '../components/ProductCard.js';
import { ProfilePicture } from '../components/AuthModal.js';
import { enableListingSearch } from '../services/search.js';
import { logoutuser } from '../services/auth.js';
import { showNotification } from '../services/notifications.js';


document.addEventListener("DOMContentLoaded", async function () {
    enableListingSearch();
    const body = document.body;
    const add_product_btn = document.getElementById("add_product_btn");
    const profile_picture = document.getElementById("profile_pic");

    document.getElementById("add_product_btn").addEventListener("click", function () {
        window.location.href = "create_auction.html";
    });
 
        new ProfilePicture(profile_picture);


    const body_left = document.createElement("div");
    body_left.classList.add("body_left");

    const pages_container = document.createElement("div");
    pages_container.classList.add("pages_container");


    const pages = ["Home", "My Dashboard", "Browse Listings", "Contact", "Account", "Sign Out"];
    const page_link = ["index.html", "dashboard.html", "sales_page.html", "contact.html", "profile.html", "index.html"];
    const icons = ["fa-house", "fa-chart-line", "fa-store", "fa-headset", "fa-user", "fa-sign-out"];



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

    body_left.appendChild(pages_container);
    body.appendChild(body_left);

    const body_right = document.createElement("div");
    body_right.classList.add("body_right");

    const header_lp = document.createElement("div");
    header_lp.classList.add("header_lp");

    const header_lp_left = document.createElement("div");
    header_lp_left.classList.add("header_lp_left");

    const header_lp_title = document.createElement("h1");
    header_lp_title.classList.add("header_lp_title");
    header_lp_title.innerText = "Welcome Back";

    const header_lp_subtitle = document.createElement("p");
    header_lp_subtitle.classList.add("header_lp_subtitle");
    header_lp_subtitle.innerText = "User";

    header_lp_title.appendChild(header_lp_subtitle);
    header_lp_left.appendChild(header_lp_title);
    ;


    header_lp.append(header_lp_left);
    body_right.appendChild(header_lp);



    const main_content = document.createElement("div");
    main_content.classList.add("main_content");

    const content_box = document.createElement("div");
    content_box.classList.add("content_box");

    const total_earnings = document.createElement("div");
    total_earnings.classList.add("overview_div");
    total_earnings.id = "total_earning";

    const display_earning = document.createElement("div");
    display_earning.classList.add("display_div");

    const title_container_earning = document.createElement("div");
    title_container_earning.classList.add("title_container");

    const display_earning_value = document.createElement("h2");
    display_earning_value.innerText = "0";
    const display_earning_text = document.createElement("p");
    display_earning_text.innerText = "Total Earnings";

    title_container_earning.append(display_earning_value, display_earning_text);

    const display_earning_icon = document.createElement("i");
    display_earning_icon.classList.add("fa-solid", "fa-euro-sign");

    display_earning.append(display_earning_icon, title_container_earning);

    total_earnings.append(display_earning);

    const total_sold_items = document.createElement("div");
    total_sold_items.classList.add("overview_div");
    total_sold_items.id = "total_sold_items";

    const display_sold = document.createElement("div");
    display_sold.classList.add("display_div");

    const title_container_sold = document.createElement("div");
    title_container_sold.classList.add("title_container");

    const display_sold_title = document.createElement("h2");
    display_sold_title.innerText = "0";
    const display_sold_text = document.createElement("p");
    display_sold_text.innerText = "Total Sold Items";

    title_container_sold.append(display_sold_title, display_sold_text);

    const display_sold_icon = document.createElement("i");
    display_sold_icon.classList.add("fa-solid", "fa-clipboard");

    display_sold.append(display_sold_icon, title_container_sold);
    total_sold_items.append(display_sold);


    const total_bought_items = document.createElement("div");
    total_bought_items.classList.add("overview_div");
    total_bought_items.id = "total_bought_items";

    const display_buy = document.createElement("div");
    display_buy.classList.add("display_div");

    const title_container_buy = document.createElement("div");
    title_container_buy.classList.add("title_container");

    const display_buy_value = document.createElement("h2");
    display_buy_value.innerText = "0";
    const display_buy_text = document.createElement("p");
    display_buy_text.innerText = "Total Bought Items";

    title_container_buy.append(display_buy_value, display_buy_text);

    const display_buy_icon = document.createElement("i");
    display_buy_icon.classList.add("fa-solid", "fa-shopping-cart");

    display_buy.append(display_buy_icon, title_container_buy);
    total_bought_items.append(display_buy);

    content_box.append(total_earnings, total_sold_items, total_bought_items);
    main_content.append(content_box);

    body_right.appendChild(main_content);

    const listing_board = document.createElement("div");
    listing_board.classList.add("listing_board");

    new Loaduserslistings(listing_board, add_product_btn, header_lp_subtitle, body);

    body_right.appendChild(listing_board);
    body.appendChild(body_right);

    //new userDashboardData( main_table_cont, display_sold_title, display_buy_value, display_earning_value);

});
