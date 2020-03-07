# @nathanhoad/next-api

Some API helpers for [Next.js](https://nextjs.org/).

`npm i @nathanhoad/next-api`

## Controllers

User controllers to help define simple CRUD API endpoints. Note, that the D here is _destroy_, not _delete_ as delete is a reserved word in JavaScript and this makes it easier to pass around.

```ts
import { Controller } from "@nathanhoad/next-api";
import Things from "../models/Things";

class ThingsController extends Controller {
  async index(query: any) {
    return await Things.all();
  }

  async create(body: any) {
    return Things.create(body);
  }

  async read(query: any) {
    return await Things.find(query.id);
  }

  async update(query: any, body: any) {
    const thing = await Things.find(query.id);
    return await Things.save({ ...thing, body });
  }

  async destroy(query: any) {
    const thing = await Things.find(query.id);
    return await Things.destroy(thing);
  }
}

export default new ThingsController();
```

Then you can use them in your `index.ts` and `[id].ts` API route handlers:

```ts
// index.ts
import thingsController from "../../../controllers/ThingsController";

export default thingsController.handleCollection();
```

```ts
// [id].ts
import thingsController from "../../../controllers/ThingsController";

export default thingsController.handItem();
```

## API client

The API client is best used in conjunction with something like [SWR](https://swr.now.sh/).

First, make sure to set a `URL` in your [public runtime config](https://nextjs.org/docs/api-reference/next.config.js/runtime-configuration).

If you are wanting to use the JWT session handling then make sure to set a `SESSION_NAME` too (just your app's name should be fine).

Then you can use `create`, `read`, `update`, and `destroy` in your pages and components.

Something like:

```tsx
// [id].tsx
import { NextPage } from "next/page";
import useSWR, { mutate } from "swr";
import { read, update } from "@nathanhoad/next-api";

import { IThing } from "../../types";

interface Props {
  thing: IThing;
}

const ThingPage: NextPage<Props> = props => {
  const { data: thing } = useSWR<IThing>(`/things/${props.thing.id}`, read, { initialData: props.thing });

  async function addOne() {
    const updatedThing = { ...thing, counter: thing.counter + 1 };
    // Send the change to the api
    update(`/things/${thing.id}`, updatedThing);
    // Update the local cache immediately (without revalidating)
    mutate(`/things/${props.thing.id}`, updatedThing, false);
    mutate(`/things`);
  }

  return (
    <main>
      <h1>{thing.name}</h1>
      <div>This has been clicked {thing.counter} times</div>
      <button onClick={() => addOne()}>Click it again!</button>
    </main>
  );
};

ThingPage.getInitialProps = async ({ query }) => {
  return {
    thing: await read(`/things/${query.id}`)
  };
};

export default ThingPage;
```
