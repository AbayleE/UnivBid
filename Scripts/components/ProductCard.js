import { auth, onAuthStateChanged } from '../../firebase.js';
import { getproductDetail, updateProductDetail, addNewProduct, deleteProduct, fetchProducts } from '../services/api.js';
import { getCurrentuserdata } from '../services/auth.js';
import { showNotification } from '../services/notifications.js';



export class createListing {
    constructor(productValue){
        this.newProductval = productValue;
        this.addnewProduct();
    }
    async addnewProduct(newProductval) {
        try {
            const currentUser = await getCurrentuserdata();
            const result = await addNewProduct(this.newProductval);
            if (!result.success) throw new Error(result.error || "Failed to update product");
            
            showNotification("Product added successfully!", 'success');
        } catch (error) {
            console.error("Failed to Add products: ", error);
            showNotification(`Product Add Failed: ${error.message}`, 'error');
        }
    }
};

export class imageUpload {
    constructor(image,imageURL) {
        this.file = image;
        this.imageURL = imageURL;
        this.setup();
    }


    async setup() {
        if (this.file) {
            if (this.file.size > 307200) {
                showNotification("File is too large! Please upload an image smaller than 300KB.");
                return;
            }
            
            const formData = new FormData();
            formData.append('file', this.file);
            formData.append('upload_preset', 'unsigned_uploads');
            formData.append('cloud_name', 'dn6sg7qiq');

            try {
                const response = await fetch('https://api.cloudinary.com/v1_1/dn6sg7qiq/image/upload', {
                    method: 'POST',
                    body: formData,
                });

                const result = await response.json();

                if (response.ok) {
                    const image_url = result.secure_url;
                    this.imageURL = image_url;
                    return {image_url};
                } else {
                    console.error('Upload failed:', result.error.message);
                }
            } catch (error) {
                console.error('Error uploading image:', error);
            }
        }
    }
};

export class Loaduserslistings {
    constructor(container, addBtn, header_title, body) {
        this.container = container;
        this.button = addBtn;
        this.currentDialog = null;
        this.header_title = header_title;
        this.body = body;
        this.setup();
    }

    setup() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const result = await getCurrentuserdata();
                if (result) {
                    this.header_title.innerText = `${result.firstName}`;
                }
                this.DisplayListings();
                this.checksBtnstatus();
            } else {
                showNotification("Please login first");
                window.location.href = "sign_in.html";
            }
        });
    }

    checksBtnstatus() {
        this.button.addEventListener("click", async (e) => {
            e.preventDefault();
            this.openDialogBox();

        });
    }

    openDialogBox(data = null) {
        if (this.currentDialog) {
            this.removeDialog();
        }

        const product_dialog = document.createElement("dialog");
        product_dialog.classList.add("product_dialog");
        this.currentDialog = product_dialog;

        const title = document.createElement("h2");
        title.innerText = "Add New Product";
        product_dialog.appendChild(title);

        const input_container = document.createElement("div");
        input_container.classList.add("input_container");

        const product_name_cont = document.createElement("div");
        product_name_cont.classList.add("add_product_input_cont");
        const product_name_label = document.createElement("label");
        product_name_label.innerText = "Product Name: "
        const product_name = document.createElement("input");
        product_name.id = "product_name";
        product_name_cont.append(product_name_label, product_name);


        const product_desc_cont = document.createElement("div");
        product_desc_cont.classList.add("add_product_input_cont", "fullwidth");
        const product_desc_label = document.createElement("label");
        product_desc_label.innerText = "Product Description: "
        const product_description = document.createElement("textarea");
        product_description.id = "product_description";
        product_desc_cont.append(product_desc_label, product_description);


        const product_price_cont = document.createElement("div");
        product_price_cont.classList.add("add_product_input_cont");
        const product_price_label = document.createElement("label");
        product_price_label.innerText = "Product Price: "
        const product_price = document.createElement("input");
        product_price.id = "product_price";
        product_price.type = "number";
        product_price_cont.append(product_price_label, product_price);

        const product_quantity_cont = document.createElement("div");
        product_quantity_cont.classList.add("add_product_input_cont");
        const product_quantity_label = document.createElement("label");
        product_quantity_label.innerText = "Product Quantity: "
        const product_quantity = document.createElement("input");
        product_quantity.id = "product_quantity";
        product_quantity.type = "number";
        product_quantity_cont.append(product_quantity_label, product_quantity);


        const product_cond_cont = document.createElement("div");
        product_cond_cont.classList.add("add_product_input_cont");

        const condition_label = document.createElement("label");
        condition_label.innerText = "Product Condition: ";

        const condition_labels = document.createElement("select");

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
        let imageURL = data?.image || " ";

        product_image.addEventListener("change", async function (event) {
            const file = product_image.files[0];

            if (file) {
                if (file.size > 102400) {
                    showNotification("File is too large! Please upload an image smaller than 100KB.");
                    return;
                }

                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', 'unsigned_uploads');
                formData.append('cloud_name', 'dn6sg7qiq');

                try {
                    const response = await fetch('https://api.cloudinary.com/v1_1/dn6sg7qiq/image/upload', {
                        method: 'POST',
                        body: formData,
                    });

                    const result = await response.json();

                    if (response.ok) {
                        const image_url = result.secure_url;
                        imageURL = image_url;
                    } else {
                        console.error('Upload failed:', result.error.message);
                    }
                } catch (error) {
                    console.error('Error uploading image:', error);
                }
            }
        });

        product_image_cont.append(product_image_label, product_image);

        const button_div_cont = document.createElement("div");
        button_div_cont.classList.add("button_div_cont");

        const button_submit = document.createElement("button");
        button_submit.id = "submit_btn";
        button_submit.innerText = "Add Product";

        const button_close = document.createElement("button");
        button_close.id = "close_btn";
        button_close.innerText = "Close";

        button_div_cont.append(button_submit, button_close);


        if (data) {
            product_name.value = data.name;
            product_quantity.value = data.product_quantity;
            product_description.value = data.description;
            product_price.value = data.price;
            condition_labels.value = data.condition;
            imageURL = data.image;
            button_submit.innerText = "Edit";

            const view_btn = document.createElement("button");
            view_btn.innerText = "View Details";
            view_btn.classList.add("view-btn");

            view_btn.addEventListener("click", () => {
                sessionStorage.setItem("selected_item", JSON.stringify(data));
                window.location.href = "product_listing_page.html";
            });
            button_div_cont.appendChild(view_btn);

        }


        button_submit.addEventListener("click", async () => {

            const productvalues = {
                name: product_name.value,
                description: product_description.value,
                price: parseFloat(product_price.value).toFixed(2),
                condition: condition_labels.value,
                image: imageURL || "",
                product_quantity: product_quantity.value
            }

            if (data) {
                this.updateProduct(productvalues, data.pid);
            } else {
                this.addnewProduct(productvalues);
            }

            this.removeDialog();
        });


        button_close.addEventListener("click", () => {
            this.removeDialog();
        });

        input_container.append(product_name_cont, product_desc_cont, product_price_cont, product_quantity_cont, product_cond_cont, product_image_cont, button_div_cont);
        product_dialog.appendChild(input_container);
        this.container.appendChild(product_dialog);
        product_dialog.showModal();

    }

    async removeDialog() {
        if (this.currentDialog) {
            this.currentDialog.remove();
            this.currentDialog = null;
            await this.DisplayListings();
        }

    }

    async updateProduct(newProductval, pid) {
        try {
            const result = await updateProductDetail(newProductval, pid);
            if (!result.success) throw new Error(result.error || "Failed to update product");
            showNotification("Product updated successfully!", 'success');
            await this.DisplayListings();

        } catch (error) {
            console.error("Failed to get products: ", error);
            showNotification(`Product Update Failed: ${error.message}`, 'error');

        }
    }

    async addnewProduct(newProductval, pid) {
        try {
            const currentUser = await getCurrentuserdata();
            const result = await addNewProduct(newProductval, pid);
            if (!result.success) throw new Error(result.error || "Failed to update product");
            this.displayProducts(result.product);
            //await this.DisplayListings();
            showNotification("Product added successfully!", 'success');
        } catch (error) {
            console.error("Failed to Add products: ", error);
            showNotification(`Product Add Failed: ${error.message}`, 'error');
        }
    }

    async removeProduct(pid) {
        try {
            const result = await deleteProduct(pid);
            if (!result.success) throw new Error(result.error);
            await this.DisplayListings();
            showNotification("Product deleted Successfully!", 'success');
        } catch (error) {
            console.error("Failed to delete products: ", error);
            showNotification(`Removing Product Failed:${error.message} `, 'error');
        }
    }


    async DisplayListings() {
        try {
            this.container.innerHTML = '';
            const result = await getproductDetail();
            if (result.success) {
                if (result.products && result.products.length > 0) {
                    this.displayProducts(result.products);
                } else {
                    this.displayNoProducts();
                }
            } else {
                showNotification(`Failed to display products: ${result.error} `, 'error');

            }

        } catch (error) {
            console.error("Failed to get products for the user: ", error);
            showNotification(`Fetching product for user failed: ${error.message}` + 'error');
        }

    }

    displayNoProducts() {
        const title = document.createElement("p");
        title.style.marginLeft = "85px";
        title.innerText = "No products found";
        this.container.appendChild(title);
    }

    displayProducts(products) {

        products.forEach(data => {
            const product_card = document.createElement("div");
            product_card.classList.add("product_card_list");

            const img = document.createElement("img");
            img.src = data.image || "../../Images/13.png";
            img.alt = data.name || "Product Image";
            product_card.appendChild(img);

            const info_product = document.createElement("div");
            info_product.classList.add("info_product");

            const name = document.createElement("span");
            const name_label = document.createElement("strong");
            name_label.textContent = " Product Name: ";
            name.append(name_label, ` ${data.name || "No Name Available"}`);
            info_product.appendChild(name);
            const price = document.createElement("span");
            const price_label = document.createElement("strong");
            price_label.textContent = "Price:";
            price.append(price_label, ` € ${data.price || "N/A"}`);
            info_product.appendChild(price);

            product_card.appendChild(info_product);

            const edit_btn = document.createElement("button");
            edit_btn.innerText = "Edit Details";
            edit_btn.classList.add("edit-btn");
            product_card.appendChild(edit_btn);

            edit_btn.addEventListener("click", () => {
                this.openDialogBox(data);
            });

            const delete_btn = document.createElement("button");
            delete_btn.innerText = "Remove";
            delete_btn.classList.add("delete-btn");
            product_card.appendChild(delete_btn);

            delete_btn.addEventListener("click", () => {
                this.removeProductDialog(data.pid);
            });

            this.container.appendChild(product_card);
        });


    }

    removeProductDialog(pid) {
        const delete_dialog = document.createElement("dialog");
        delete_dialog.classList.add("delete_dialog");

        const icon = document.createElement("i");
        icon.classList.add("fa-solid", "fa-x");

        const text_header = document.createElement("h2");
        text_header.textContent = "Confirm Removal"
        const text = document.createElement("p");
        text.textContent = "Are you sure you want to remove the product?";

        const button_div = document.createElement("div");
        button_div.classList.add("button_div");

        const button_yes = document.createElement("button");
        button_yes.innerText = "Remove";
        button_yes.classList.add("yes_button");

        const button_no = document.createElement("button");
        button_no.innerText = "Cancel";
        button_no.classList.add("no_button");

        button_div.append(button_yes, button_no);

        delete_dialog.append(icon, text_header, text, button_div);
        this.body.appendChild(delete_dialog);
        delete_dialog.showModal();


        button_yes.addEventListener("click", async () => {
            this.removeProduct(pid)
            delete_dialog.remove();

        });

        button_no.addEventListener("click", () => {
            delete_dialog.close();
            delete_dialog.remove();

        });

        icon.addEventListener("click", () => {
            delete_dialog.close();
            delete_dialog.remove();

        });


    }


}

export class getallProducts {
    constructor(container) {
        this.container = container;
        this.setup();
    }

    setup() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const result = await getCurrentuserdata();
                await this.fetchAllproducts(user.uid);
            } else {
                showNotification("Please login first");
                window.location.href = "sign_in.html";
            }
        });
    }

    async fetchAllproducts(userID) {
        try {
            this.container.innerHTML = '';
            const result = await fetchProducts(userID);

            if (result.success) {
                if (result.products && result.products.length > 0) {
                    this.displayallProducts(result.products);
                } else {
                    this.container.innerHTML = "<p>No available products found.</p>";
                }
            } else {
                showNotification(`Failed to display products: ${result.error} `, 'error');
            }

        } catch (error) {
            console.error("Failed to fetch products: ", error);
            showNotification("Fetching Product Failed: ", 'error');
        }
    }

    displayallProducts(products) {

        products.forEach(data => {
            const product_card = document.createElement("div");
            product_card.classList.add("product_card");

            const img_div = document.createElement("div");
            img_div.classList.add("img_div");

            const img = document.createElement("img");
            img.src = data.image || "../Images/11.png";
            img.alt = data.name || "Product Image";

            //    img_div.appendChild(img);
            img_div.style.setProperty('--bg-image', `url('${img.src}')`);
            product_card.appendChild(img_div);

            const products_info_div = document.createElement("div");
            products_info_div.classList.add("products_info_div");

            const info_product = document.createElement("div");
            info_product.classList.add("info_product");

            const name = document.createElement("span");
            const name_text = document.createElement("strong");
            name_text.textContent = data.name || "No Name Available";
            name.appendChild(name_text);
            info_product.appendChild(name);

            const listing_rank = document.createElement("span");
            let stars = 0;

            switch (data.condition) {
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
            info_product.appendChild(listing_rank);

            const price = document.createElement("span");
            price.textContent = ` €‎ ${data.price || "N/A"} `;
            price.style.color = "#2f2f2f";
            info_product.appendChild(price);

            const cta_buy_now = document.createElement("button");
            cta_buy_now.innerHTML = ' Buy';
            cta_buy_now.id = "buy_now";

            products_info_div.append(info_product, cta_buy_now);
            product_card.append(products_info_div);

            product_card.addEventListener("click", () => {
                sessionStorage.setItem("selected_item", JSON.stringify(data));
                window.location.href = "product_listing_page.html";
            });

            this.container.appendChild(product_card);
        })
    }


};

export class userDashboardData {
    constructor(container, sold, bought, earnings) {
        this.container = container;
        this.sold_items_count = sold;
        this.bought_items_count = bought;
        this.earnings = earnings;
        this.setup();
    }

    setup() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const result = await getCurrentuserdata();
                await this.fetchUserdatainfo(result.id);
            } else {
                showNotification("Please login first");
                window.location.href = "sign_in.html";
            }
        });

        // fetchUserdatainfo(){

        // }
    }



}

