import { asUrl, deleteSolidDataset, FetchError, getContainedResourceUrlAll, getSourceUrl, getThingAll, isContainer, setThing, Thing, ThingPersisted, WithResourceInfo } from "@inrupt/solid-client";
import { fetch } from "@inrupt/solid-client-authn-browser";
import { FC, MouseEventHandler, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { LoadedCachedDataset } from "../../hooks/dataset";
import { ThingAdder } from "../adders/ThingAdder";
import { ThingViewer } from "./ThingViewer";
import { LoggedIn } from "../session/LoggedIn";
import { ConfirmOperation } from "../ConfirmOperation";
import { SectionHeading } from "../ui/headings";
import { VscTrash } from "react-icons/vsc";

interface Props {
  dataset: LoadedCachedDataset;
}

export const DatasetViewer: FC<Props> = (props) => {
  const [thingToRestore, setThingToRestore] = useState<ThingPersisted>();
  const things = getThingAll(props.dataset.data).sort(getThingSorter(props.dataset.data));
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);

  useEffect(() => {
    if (!thingToRestore) {
      return;
    }

    const updatedDataset = setThing(props.dataset.data, thingToRestore);
    props.dataset.save(updatedDataset).then(() => {
      setThingToRestore(undefined);
    });
  }, [thingToRestore]);

  const onUpdateThing = (changedThing: ThingPersisted) => {
    // The restoration needs to be triggered after the updated SolidDataset has been passed to
    // DatasetViewer, otherwise solid-client will think this is just a local change that it can undo:
    const undo = () => { setThingToRestore(changedThing) };
    // FIXME:
    // solid-client at the time of writing has a bug that results in it trying to recreate all Quads
    // when adding a Thing to a different SolidDatase than the one it was initially fetched from.
    // This breaks when it includes blank nodes. In lieu of that being fixed in solid-client,
    // I've disabled undo for Things containing blank nodes, relying on an undocumented API in
    // solid-client to do so.
    // In other words, once it's fixed, revert the commit that introduced this comment:
    const containsBlankNodes = (thing: ThingPersisted): boolean => {
      return Array.from(thing).findIndex((quad) => quad.object.termType === "BlankNode") !== -1;
    };
    const undoButton = !containsBlankNodes(changedThing)
      ? <button onClick={e => {e.preventDefault(); undo();}} className="underline hover:no-underline focus:no-underline">Undo.</button>
      : null;

    toast(
      <>
        Saved. {undoButton}
      </>,
      { type: "info" },
    );
  };

  const onConfirmDelete = async () => {
    try {
      await deleteSolidDataset(props.dataset.data, { fetch: fetch });
      toast("Resource deleted.", { type: "info" });
      props.dataset.revalidate();
    } catch(e) {
      if (e instanceof FetchError && e.statusCode === 403) {
        toast("You are not allowed to delete this resource.", { type: "error" });
      } else {
        console.log("ERR:", {e});
        toast("Could not delete the resource.", { type: "error" });
      }
    }
  };

  const resourceUrl = getSourceUrl(props.dataset.data);
  const resourcePartStart = isContainer(props.dataset.data)
    ? resourceUrl.substring(0, resourceUrl.lastIndexOf("/")).lastIndexOf("/")
    : resourceUrl.lastIndexOf("/");
  const resourceName = resourceUrl.substring(resourcePartStart + 1);
  const deletionModal = isRequestingDeletion
    ? (
      <ConfirmOperation
        confirmString={resourceName}
        onConfirm={onConfirmDelete}
        onCancel={() => setIsRequestingDeletion(false)}
      >
        <h2 className="text-2xl pb-2">Are you sure?</h2>
        Are you sure you want to delete this Resource? This can not be undone.
      </ConfirmOperation>
    )
    : null;

  const onDeleteFile: MouseEventHandler = (event) => {
    event.preventDefault();

    setIsRequestingDeletion(true);
  };


  const deleteButton = getContainedResourceUrlAll(props.dataset.data).length === 0
    ? (
      <>
        {deletionModal}
        <button
          className="w-full md:w-1/2 p-5 rounded border-4 border-red-700 text-red-700 focus:text-white hover:text-white flex items-center space-x-2 text-lg focus:bg-red-700 hover:bg-red-700 focus:ring-2 focus:ring-offset-2 focus:ring-red-700 focus:outline-none focus:ring-opacity-50"
          onClick={onDeleteFile}
        >
          <VscTrash aria-hidden="true"/>
          <span>Delete resource</span>
        </button>
      </>
    )
    : null;

  const dangerZone = (!!deleteButton)
    ? (
      <LoggedIn>
        <div className="pb-10">
          <SectionHeading>
            Danger Zone
          </SectionHeading>
          {deleteButton}
        </div>
      </LoggedIn>
    )
    : null;

  if (things.length === 0) {
    return (
      <>
        <div className="space-y-10 pb-10">
          <div className="rounded bg-yellow-200 p-5">
            This Resource is empty.
          </div>
          <LoggedIn>
            <ThingAdder dataset={props.dataset} onUpdate={onUpdateThing}/>
          </LoggedIn>
        </div>
        {dangerZone}
      </>
    );
  }


  return (
    <>
      <SectionHeading>
        Things
      </SectionHeading>
      <div className="space-y-10 pb-10">
        {things.map(thing => (
          <div key={asUrl(thing as ThingPersisted) + "_thing"}>
            <ThingViewer dataset={props.dataset} thing={thing as ThingPersisted} onUpdate={onUpdateThing}/>
          </div>
        ))}
        <LoggedIn>
          <ThingAdder dataset={props.dataset} onUpdate={onUpdateThing}/>
        </LoggedIn>
      </div>
      {dangerZone}
    </>
  );
};

function getThingSorter(resource: WithResourceInfo) {
  const resourceUrl = getSourceUrl(resource);
  return (a: Thing, b: Thing) => {
    const aUrl = asUrl(a, resourceUrl);
    const aUrlObj = new URL(aUrl);
    aUrlObj.hash = "";
    const bUrl = asUrl(b, resourceUrl);
    const bUrlObj = new URL(bUrl);
    bUrlObj.hash = "";
    if (aUrlObj.href === resourceUrl && bUrlObj.href !== resourceUrl) {
      return -1;
    }
    if (aUrlObj.href !== resourceUrl && bUrlObj.href === resourceUrl) {
      return 1;
    }
    if(aUrl.indexOf("#") === -1 && bUrl.indexOf("#") !== -1) {
      return -1;
    }
    if(aUrl.indexOf("#") !== -1 && bUrl.indexOf("#") === -1) {
      return 1;
    }
    return aUrl.localeCompare(bUrl);
  };
}