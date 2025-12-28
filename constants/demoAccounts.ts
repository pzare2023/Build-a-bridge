export interface DemoAccount {
  id: string;
  email: string;
  password: string;
  name: string;
  role: "announcer" | "admin";
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "announcer1",
    email: "announcer1@demo.com",
    password: "pass123",
    name: "Parnia",
    role: "announcer",
  },
  {
    id: "announcer2",
    email: "announcer2@demo.com",
    password: "pass123",
    name: "Samantha",
    role: "announcer",
  },
  {
    id: "announcer3",
    email: "announcer3@demo.com",
    password: "pass123",
    name: "Saanika",
    role: "announcer",
  },
  {
    id: "announcer4",
    email: "announcer4@demo.com",
    password: "pass123",
    name: "Sanya",
    role: "announcer",
  },
  {
    id: "announcer5",
    email: "announcer5@demo.com",
    password: "pass123",
    name: "Kiana",
    role: "announcer",
  },
  {
    id: "admin",
    email: "admin@demo.com",
    password: "admin123",
    name: "System Admin",
    role: "admin",
  },
];

export const validateCredentials = (
  email: string,
  password: string
): DemoAccount | null => {
  const account = DEMO_ACCOUNTS.find(
    (acc) => acc.email === email && acc.password === password
  );
  return account || null;
};
