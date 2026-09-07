import Logo from "../logo/Logo";

interface SidebarProps {
  children: React.ReactNode;
}

/**
 * Sidebar component that contains the BeerBuddy logo
 * and a main section for the filter components.
 *
 * Hidden below the tablet breakpoint, where the same filters are reached
 * through the filter button's dialog instead.
 * @param children - filter components
 * @returns a Sidebar component
 */
const Sidebar = ({ children }: SidebarProps) => {
  return (
    <section
      aria-label="Sidebar"
      className="hidden h-screen w-[18rem] shrink-0 overflow-y-auto border-r border-rule px-lg py-xl tablet:block"
    >
      <div className="flex flex-col gap-xl">
        <Logo />
        {children}
      </div>
    </section>
  );
};
export default Sidebar;
