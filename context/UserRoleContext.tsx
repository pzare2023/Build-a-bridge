// context/UserRoleContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";

type UserRole = "announcer" | "passenger" | null;

type UserRoleContextValue = {
  role: UserRole;
  setRole: (role: UserRole) => void;
};

const UserRoleContext = createContext<UserRoleContextValue | undefined>(
  undefined
);

export const UserRoleProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<UserRole>(null);

  return (
    <UserRoleContext.Provider value={{ role, setRole }}>
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRole = () => {
  const ctx = useContext(UserRoleContext);
  if (!ctx) {
    throw new Error("useUserRole must be used within a UserRoleProvider");
  }
  return ctx;
};
