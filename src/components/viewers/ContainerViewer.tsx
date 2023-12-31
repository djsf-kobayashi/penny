import {
  getContainedResourceUrlAll,
  getSourceUrl,
  isContainer,
  UrlString,
} from "@inrupt/solid-client";
import React, { FC } from "react";
import Link from "next/link";
import { SectionHeading } from "../ui/headings";
import { ResourceAdder } from "../adders/ResourceAdder";
import { LoggedOut } from "../session/LoggedOut";
import { getExplorePath } from "../../functions/integrate";
import { ClientLocalized } from "../ClientLocalized";
import { LoadedCachedDataset } from "../../hooks/dataset";

interface Props {
  dataset: LoadedCachedDataset;
}

export const ContainerViewer: FC<Props> = (props) => {
  let containedResources = getContainedResourceUrlAll(props.dataset.data)
    .sort(compareResourceUrls)
    .map((resourceUrl) => {
      const name = resourceUrl.substring(
        getSourceUrl(props.dataset.data).length
      );
      return (
        <Link
          key={resourceUrl + "_containerChild"}
          href={getExplorePath(resourceUrl)}
          className="bg-gray-700 text-white p-5 rounded hover:bg-gray-900 block focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 focus:outline-none focus:ring-opacity-50"
        >
          {decodeURIComponent(name)}
        </Link>
      );
    });

  // There's an "Add Resource" button when you're logged in,
  // so no need to display the warning if so:
  const emptyWarning =
    containedResources.length === 0 ? (
      <LoggedOut>
        <ClientLocalized id="container-empty">
          <div className="rounded bg-yellow-200 p-5">
            This container is empty.
          </div>
        </ClientLocalized>
      </LoggedOut>
    ) : null;

  return (
    <>
      <ClientLocalized id="container-children-heading">
        <SectionHeading>Contained Resources</SectionHeading>
      </ClientLocalized>
      <div className="pb-10">
        <div className="grid sm:grid-cols-2 gap-5 pb-5">
          {containedResources}
        </div>
        {emptyWarning}
        <ResourceAdder container={props.dataset} />
      </div>
    </>
  );
};

function compareResourceUrls(a: UrlString, b: UrlString): number {
  if (isContainer(a) && !isContainer(b)) {
    return -1;
  }
  if (!isContainer(a) && isContainer(b)) {
    return 1;
  }

  return a.localeCompare(b);
}
