import React, {
  FC,
  FormEventHandler,
  ReactNode,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { UrlString } from "@inrupt/solid-client";
import { useRouter } from "next/router";
import { LocationBar } from "./LocationBar";
import { SubmitButton, TextField } from "./ui/forms";
import { UserMenu } from "./session/UserMenu";
import { VscTwitter } from "react-icons/vsc";
import { SiMastodon, SiGitlab } from "react-icons/si";
import { getExplorePath } from "../functions/integrate";
import { NotIntegrated } from "./integrated/NotIntegrated";
import { ClientLocalized } from "./ClientLocalized";
import { useL10n } from "../hooks/l10n";

interface Props {
  children: ReactNode;
  path?: UrlString;
}

export const Layout = (props: Props) => {
  const [isEditingPath, setIsEditingPath] = useState(false);
  const router = useRouter();
  const l10n = useL10n();

  const locationBarClass =
    props.path && props.path.length > 100
      ? "lg:text-md xl:text-lg"
      : "md:text-lg lg:text-xl";
  const locationBar =
    props.path && !isEditingPath ? (
      <h2 className={`text-md ${locationBarClass}`}>
        <LocationBar
          location={props.path}
          onEdit={() => setIsEditingPath(true)}
        />
      </h2>
    ) : (
      <NotIntegrated>
        <UrlBar path={props.path} />
      </NotIntegrated>
    );

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      setIsEditingPath(false);
    };

    router.events.on("routeChangeStart", handleRouteChange);
    router.events.on("hashChangeStart", handleRouteChange);

    // If the component is unmounted, unsubscribe
    // from the event with the `off` method:
    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
      router.events.off("hashChangeStart", handleRouteChange);
    };
  }, [router.events]);

  return (
    <>
      <div className="flex flex-col min-h-screen">
        <header className="bg-gray-50">
          <div className="container mx-auto flex flex-col-reverse items-start sm:flex-row md:items-center space-y-5 md:space-y-0 px-5 pb-8 sm:pt-5 md:pt-8">
            <h1 className="hidden pr-10 md:mr-0 md:block text-xl md:text-2xl">
              <Link
                href="/"
                className="focus:underline focus:text-gray-700 focus:outline-none font-bold py-3 px-5 border-t-8 border-b-8 border-gray-50 hover:bg-white hover:border-red-500 hover:text-red-500"
              >
                Penny
              </Link>
            </h1>
            <div className="flex-grow w-full">{locationBar}</div>
            <div className="pl-5 md:pl-10 flex self-end items-center py-2">
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="flex-grow w-full">{props.children}</main>
        <footer className="px-8 py-14">
          <div className="flex items-center space-x-3 justify-center border-gray-50 border-t-2 pt-10 text-gray-700">
            <ClientLocalized
              id="footer-author"
              elems={{
                "author-link": (
                  <a
                    href="https://VincentTunru.com"
                    className="border-gray-700 border-b-2 hover:text-gray-900 hover:border-b-4 focus:outline-none focus:bg-gray-700 focus:text-white"
                  />
                ),
              }}
            >
              <span>By Vincent Tunru.</span>
            </ClientLocalized>
            <a
              href="https://twitter.com/VincentTunru"
              title={l10n.getString("twitter-tooltip")}
              className="text-gray-500 p-2 border-2 border-white rounded hover:text-gray-700 hover:border-gray-700 focus:outline-none focus:text-gray-700 focus:border-gray-700"
            >
              <VscTwitter aria-label={l10n.getString("twitter-label")} />
            </a>
            <a
              href="https://fosstodon.org/@VincentTunru"
              title={l10n.getString("mastodon-tooltip")}
              className="text-gray-500 p-2 border-2 border-white rounded hover:text-gray-700 hover:border-gray-700 focus:outline-none focus:text-gray-700 focus:border-gray-700"
            >
              <SiMastodon aria-label={l10n.getString("mastodon-label")} />
            </a>
            <a
              href="https://gitlab.com/VincentTunru/Penny/"
              title={l10n.getString("gitlab-tooltip")}
              className="text-gray-500 p-2 border-2 border-white rounded hover:text-gray-700 hover:border-gray-700 focus:outline-none focus:text-gray-700 focus:border-gray-700"
            >
              <SiGitlab aria-label={l10n.getString("gitlab-label")} />
            </a>
          </div>
        </footer>
      </div>
    </>
  );
};

interface UrlBarProps {
  path?: UrlString;
}
const UrlBar: FC<UrlBarProps> = (props) => {
  const router = useRouter();
  const l10n = useL10n();
  const [url, setUrl] = useState(
    props.path ? decodeURIComponent(props.path) : ""
  );

  const onSubmit: FormEventHandler = (e) => {
    e.preventDefault();
    const normalisedUrl = normaliseUrlInput(url, props.path);
    if (normalisedUrl === null) {
      const urlField = e.target;
      if (urlField instanceof HTMLInputElement) {
        urlField.setCustomValidity(l10n.getString("urlbar-error-invalid"));
        urlField.reportValidity();
      }
      return;
    }
    const targetPath = getExplorePath(encodeURI(normalisedUrl));
    router.push(targetPath);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex-grow flex items-center py-1 space-x-3 w-full"
    >
      <ClientLocalized id="urlbar-label">
        <label htmlFor="urlInput" className="hidden md:inline">
          URL:
        </label>
      </ClientLocalized>
      <TextField
        // Not of type `url`, so the user can enter e.g. "../":
        type="text"
        name="urlInput"
        id="urlInput"
        value={url}
        placeholder="https://&hellip;"
        autoFocus={true}
        onChange={setUrl}
        className="w-full p-2"
        required={true}
        autoComplete="url"
        inputMode="url"
      />
      <ClientLocalized id="urlbar-button-label" attrs={{ value: true }}>
        <SubmitButton value="Go" className="px-5 py-2" />
      </ClientLocalized>
    </form>
  );
};

function normaliseUrlInput(
  input: string,
  baseUrl?: UrlString
): UrlString | null {
  const trimmedInput = input.trim();
  try {
    const normalisedUrl = new URL(trimmedInput, baseUrl);
    return normalisedUrl.href;
  } catch (e) {
    return null;
  }
}
