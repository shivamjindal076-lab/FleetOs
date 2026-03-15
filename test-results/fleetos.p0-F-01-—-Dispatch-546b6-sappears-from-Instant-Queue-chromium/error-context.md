# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - heading "Staff Login" [level=1] [ref=e7]
        - paragraph [ref=e8]: Sign in to access admin, driver, and pricing panels
      - generic [ref=e9]:
        - generic [ref=e10]:
          - text: Email
          - textbox "Email" [ref=e11]:
            - /placeholder: you@example.com
            - text: shivamjindal076@gmail.com
        - generic [ref=e12]:
          - text: Password
          - textbox "Password" [ref=e13]:
            - /placeholder: ••••••••
            - text: your_password_here
        - paragraph [ref=e14]: Invalid login credentials
        - button "Sign In" [ref=e15] [cursor=pointer]:
          - img
          - text: Sign In
      - paragraph [ref=e16]:
        - text: Don't have an account?
        - button "Sign Up" [ref=e17] [cursor=pointer]
    - button "← Back to Customer View" [ref=e19] [cursor=pointer]
```