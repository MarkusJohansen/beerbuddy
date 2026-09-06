import { Button, Card, Form, Input, theme } from "antd";
import type { ValidateErrorEntity } from "rc-field-form/lib/interface";
import styles from "./LoginFormMobile.module.css";
import Logo from "../logo/Logo";

/**
 * Ant Design theme token used for custom styling of antd components.
 */
const { useToken } = theme;

interface LoginFormMobileProps {
  onFinishFailed: (errorInfo: ValidateErrorEntity) => void;
  saveUser: (string: { username: string }) => void;
}

/**
 * Mobile version of the login form component.
 * Contains a sales pitch and the login form.
 * @param onFinishFailed - function that is called when the form is submitted and fails validation
 * @param saveUser - function that is called when the form is submitted and passes validation
 * @returns - the mobile login form component
 */
const LoginFormMobile = ({
  onFinishFailed,
  saveUser,
}: LoginFormMobileProps) => {
  const { token } = useToken();
  return (
    <main className={styles.mobileContainer}>
      <header className={styles.logoSection}>
        <Logo />
      </header>

      <Card
        style={{
          backgroundColor: token.colorPrimaryBg,
        }}
        className={styles.mobileCard}
      >
        <section aria-label="Login form">
          <h1 className={styles.loginFormHeaderMobile}>Log in</h1>
          <Form
            name="basic"
            className={styles.loginFormMobile}
            layout="vertical"
            initialValues={{ remember: true }}
            onFinish={(values) => {
              saveUser({ username: values.username });
            }}
            onFinishFailed={onFinishFailed}
            autoComplete="off"
          >
            <Form.Item
              label="Username"
              name="username"
              className={styles.loginFormUsername}
              rules={[
                { required: true, message: "Please input your username!" },
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className={styles.loginButton}
              >
                Submit
              </Button>
            </Form.Item>
          </Form>
        </section>
      </Card>
    </main>
  );
};

export default LoginFormMobile;
