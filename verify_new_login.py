from playwright.sync_api import sync_playwright
import random
import string

def random_string(length=8):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:3000")

    # Wait for our new login screen to be visible
    page.wait_for_selector("#login-btn", state="visible")

    # Just take a screenshot of the new UI before anything else
    page.screenshot(path="login_ui.png")

    rand_user = "NewUI_" + random_string()

    # Try logging in with a non-existent user
    page.fill("#player-name", rand_user)
    page.fill("#player-password", "pass123")
    page.click("#login-btn")

    # Check for error message
    page.wait_for_selector("#login-error-msg:not(.hidden)", state="visible", timeout=5000)
    page.screenshot(path="login_ui_error.png")

    # Try registering
    page.click("#register-btn")

    try:
        page.wait_for_selector("#main-menu", state="visible", timeout=5000)
        print("Registration successful!")
    except Exception as e:
        print("Registration failed:", e)

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
