import { auth, onAuthStateChanged } from '../../firebase.js';
import { getCurrentuserdata, logoutuser, registerUser, signinUser } from '../services/auth.js';
import { updateuserProfile } from '../services/api.js';
import { showNotification } from '../services/notifications.js';
import { fetchuser_profile } from '../services/api.js';

export class AuthButton {
    // registerBtn and loginBtn are header links; browseBtn and signupCta are
    // optional hero buttons. Each adapts to the signed-in state.
    constructor(registerBtn, browseBtn, loginBtn, signupCta) {
        this.button = registerBtn;
        this.browseBtn = browseBtn;
        this.loginBtn = loginBtn;
        this.signupCta = signupCta;
        this.setup();
    }

    setup() {
        if (!this.button || !this.loginBtn) return;
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                await this.showSignedIn();
            } else {
                this.showSignedOut();
            }
            this.setBrowse(Boolean(user));
        });
    }

    setBrowse(isloggedin) {
        if (this.browseBtn) {
            this.browseBtn.setAttribute('href', isloggedin ? 'sales_page.html' : 'sign_in.html');
        }
        if (this.signupCta && isloggedin) {
            this.signupCta.textContent = 'Sell an item';
            this.signupCta.setAttribute('href', 'create_auction.html');
        }
    }

    async showSignedIn() {
        this.loginBtn.textContent = 'Dashboard';
        this.loginBtn.setAttribute('href', 'dashboard.html');

        this.button.textContent = 'Sign out';
        this.button.setAttribute('href', 'index.html');
        this.button.onclick = async (event) => {
            event.preventDefault();
            await logoutuser();
            window.location.reload();
        };
    }

    showSignedOut() {
        this.loginBtn.textContent = 'Sign in';
        this.loginBtn.setAttribute('href', 'sign_in.html');
        this.button.textContent = 'Sign up';
        this.button.setAttribute('href', 'sign_up.html');
        this.button.onclick = null;
    }
}

export class AddnewUser {
    constructor(First_name, Last_name, email, password, university, addBtn) {
        this.firstname = First_name;
        this.lastname = Last_name;
        this.email = email;
        this.password = password;
        this.university = university;
        this.submitBtn = addBtn;
        this.registerUser();
    }

    setBusy(busy) {
        if (!this.submitBtn) return;
        if (!this.submitBtn.dataset.label) this.submitBtn.dataset.label = this.submitBtn.textContent;
        this.submitBtn.disabled = busy;
        this.submitBtn.setAttribute('aria-busy', String(busy));
        this.submitBtn.textContent = busy ? 'Creating account…' : this.submitBtn.dataset.label;
    }

    async registerUser() {
        this.setBusy(true);
        const newUser = await registerUser(this.firstname, this.lastname, this.email, this.password, "", this.university);
        if (newUser.success) {
            // The sign-in page shows the confirmation, so it isn't lost on redirect.
            window.location.href = "sign_in.html?registered=1";
            return;
        }
        if (newUser.error == 'auth/email-already-in-use') {
            window.location.href = "sign_in.html?exists=1";
            return;
        }
        showNotification(`We couldn't create your account: ${newUser.error}`, 'error');
        this.setBusy(false);
    }
};


export class SigninUser {
    constructor(email, password, submitBtn, next = "dashboard.html") {
        this.email = email;
        this.password = password;
        this.submitBtn = submitBtn;
        this.next = next;
        this.signinuser();
    }

    setBusy(busy) {
        if (!this.submitBtn) return;
        if (!this.submitBtn.dataset.label) this.submitBtn.dataset.label = this.submitBtn.textContent;
        this.submitBtn.disabled = busy;
        this.submitBtn.setAttribute('aria-busy', String(busy));
        this.submitBtn.textContent = busy ? 'Signing in…' : this.submitBtn.dataset.label;
    }

    async signinuser() {
        let redirecting = false;
        try {
            this.setBusy(true);
            const signedUser = await signinUser(this.email, this.password);

            if (signedUser.success) {
                if (auth.currentUser) {
                    redirecting = true;
                    window.location.href = this.next;
                } else {
                    throw new Error("Authentication state not updated");
                }
            } else if (signedUser.error === 'auth/invalid-credential') {
                showNotification("That email and password don't match. Check them and try again.", 'error');
            } else {
                showNotification(`Sign-in failed: ${signedUser.error}`, 'error');
            }
        } catch (error) {
            console.error("Sign-in error:", error);
            showNotification("Sign-in failed: " + error.message, 'error');
        } finally {
            if (!redirecting) this.setBusy(false);
        }
    }

};


export class profileLoad {
    constructor(firstname, lastname, phone, email, university, check_box_email, check_box_phone, submitBtn, container) {
        this.firstname = firstname;
        this.lastname = lastname;
        this.phone = phone;
        this.email = email;
        this.university = university;
        this.check_box_email = check_box_email;
        this.check_box_phone = check_box_phone;
        this.button = submitBtn;
        this.container = container;
        this.checkAuthstate();
        this.setup();
    }

    checkAuthstate() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.loadProfileData();
            } else {
                showNotification("Please sign in to see your profile.", 'error');
                window.location.href = "sign_in.html";
            }
        });
    }

    async setup() {
        this.button.addEventListener('click', async (e) => {
            e.preventDefault();
            await this.updateProfile();
        });
    }

    async loadProfileData() {
        if (!auth.currentUser) return;
        try {
            const Userdata = await getCurrentuserdata();
            if (Userdata) {
                this.populateform(Userdata);
            } else {
                console.error("User Not found");
            }
        } catch (error) {
            console.error("Failed to load profile:", error);
        }

    };

    populateform(user_data) {
        this.firstname.value = user_data.firstName || '';
        this.lastname.value = user_data.lastName || '';
        this.phone.value = user_data.phone || '';
        this.email.value = user_data.email || '';
        // Set as an image source, never inside CSS, so the URL can't inject styles.
        if (user_data.avatar && this.container.tagName === 'IMG') this.container.src = user_data.avatar;
        this.university.value = user_data.university || '';
        this.check_box_email.checked = user_data.contact_choice?.contact_email ?? true;
        this.check_box_phone.checked = user_data.contact_choice?.contact_phone ?? false;
    }

    async updateProfile() {
        if (!auth.currentUser) return;
        if (!this.firstname.value.trim() || !this.lastname.value.trim()) {
            showNotification("Please enter your first and last name.", 'error');
            (this.firstname.value.trim() ? this.lastname : this.firstname).focus?.();
            return;
        }
        const label = this.button.textContent;
        this.button.disabled = true;
        this.button.setAttribute('aria-busy', 'true');
        this.button.textContent = 'Saving…';
        try {
            const contact_choice = {
                contact_email: this.check_box_email.checked,
                contact_phone: this.check_box_phone.checked
            };
            const updatedDoc = {
                firstName: this.firstname.value.trim(),
                lastName: this.lastname.value.trim(),
                email: this.email.value.trim(),
                phone: this.phone.value.trim(),
                university: this.university.value.trim(),
                contact_choice: contact_choice,
            };
            const update_profile = await updateuserProfile(updatedDoc);
            if (update_profile.success) {
                showNotification("Profile saved.", 'success');
            } else {
                showNotification(`Profile update failed: ${update_profile.error}`, 'error');
            }

        } catch (error) {
            console.error("Failed to Update profile:", error);
            showNotification("Profile update failed: " + error.message, 'error');
        }
        this.button.disabled = false;
        this.button.removeAttribute('aria-busy');
        this.button.textContent = label;
    }
}

export class ProfilePicture {
    constructor(ProfilePicture) {
        this.ProfilePicture = ProfilePicture;
        this.checkAuthstate()
    }

    checkAuthstate() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.addProfilePicture();
            }
        });

    }

    
    async addProfilePicture() {
        if (!auth.currentUser || !this.ProfilePicture) return;
        try {
            const Userdata = await fetchuser_profile();
            if (Userdata.success) {
                this.ProfilePicture.src = Userdata.profile_pic;
            } else {
                console.error("Failed to load profile picture:", Userdata.error);
            }
        } catch (error) {
            console.error("Failed to load profile:", error);
        }

    };

}