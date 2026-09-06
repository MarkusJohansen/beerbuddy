import { SortDescendingOutlined } from "@ant-design/icons";
import { Dropdown, Button } from "antd";
import { useContext } from "react";
import { FilterContext } from "../../context/FilterContext";
import type { SortingItem } from "../../types/types";

/**
 * This component is used as a more mobile friendly
 * alternative to the Ant Design Select component.
 * The component is used to select the sorting method.
 * @param items The items that are used to create the menu.
 */
const SortingButton = ({ items }: { items: SortingItem[] }) => {
  const { setSorting } = useContext(FilterContext);

  /**
   * Menu can be used to create a dropdown menu.
   * The menu is used to select the sorting method.
   * The menu cannot use set state functions directly,
   * so a handler function is used to set the sorting method.
   * @param key The key of the menu item that was clicked.
   */
  const handleMenuClick = ({ key }: { key: string }) => {
    setSorting(key);
  };

  return (
    <Dropdown
      menu={{ onClick: handleMenuClick, items: items }}
      trigger={["click"]}
      aria-label="Sorting dropdown menu"
    >
      <Button type="primary" icon={<SortDescendingOutlined />} />
    </Dropdown>
  );
};
export default SortingButton;
