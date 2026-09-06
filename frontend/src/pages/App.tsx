import Sidebar from "../components/sidebar/Sidebar";
import Actionbar from "../components/actionbar/Actionbar";
import UserIntro from "../components/user-intro/UserIntro";
import BeerList from "../components/beer-list/BeerList";
import Filters from "../components/filters/Filters";
import useFetchMoreBeers from "../utils/useFetchMoreBeers";
import appStyles from "./App.module.css";
import protectRoute from "../utils/protectRoute";
import { useEffect, useRef, useState } from "react";
import { Button, FloatButton } from "antd";
import { ArrowUpOutlined, LogoutOutlined } from "@ant-design/icons";

const App = () => {
  useEffect(() => {
    protectRoute();
  }, []);
  const { beers, totalCount, fetchMore } = useFetchMoreBeers();

  const mainRef = useRef<HTMLAnchorElement>(null);

  /**
   * Adds an event listener for the "Escape" key and executes the provided action when the key is pressed.
   * @param action The action to be executed when the "Escape" key is pressed.
   */
  const onEscape = (action: () => void) => {
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        action();
      }
    });
  };
  onEscape(() => {
    mainRef.current?.focus();
  });
  const divRef = useRef<HTMLDivElement>(null);
  const scrollToTop = () => {
    divRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };
  const [showTopBtn, setShowTopBtn] = useState(false);

  useEffect(() => {
    divRef.current?.addEventListener("scroll", () => {
      if (
        divRef.current?.scrollTop !== undefined &&
        divRef.current?.scrollTop > 100
      ) {
        setShowTopBtn(true);
      } else {
        setShowTopBtn(false);
      }
    });
  }, []);

  return (
    <>
      <a
        href="#infiniteScrollTarget"
        className={appStyles.skipLink}
        ref={mainRef}
      >
        Skip to main content
      </a>
      <Button
        icon={<LogoutOutlined style={{ fontSize: "1.5rem", color: "black" }} />}
        onClick={() => {
          localStorage.removeItem("userIdBeerBuddy");
          window.location.reload();
        }}
        aria-label="Logout button"
        className={appStyles.logoutBtn}
        style={{
          width: "2.5rem",
        }}
      />
      <div className={appStyles.appBody}>
        <Sidebar>
          <Filters fetchMore={fetchMore} />
        </Sidebar>
        <main
          className={appStyles.mainSection}
          id="infiniteScrollTarget"
          ref={divRef}
        >
          <UserIntro />
          <Actionbar fetchMore={fetchMore} />
          <BeerList
            beers={beers}
            totalCount={totalCount}
            fetchMore={fetchMore}
          />
          {showTopBtn && (
            <FloatButton
              onClick={scrollToTop}
              className={appStyles.iconStyle}
              aria-label="Scroll to top button"
              tooltip="To top"
              icon={<ArrowUpOutlined />}
            />
          )}
        </main>
      </div>
    </>
  );
};

export default App;
