# Person -> Character

Reimagine the person to cosplay as a Naruto shinobi character with weapons, ninja accessories, outfit, and headband. Realistic 3D graphics rendered in Unreal Engine.

```js
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/nano-banana/edit", {
  input: {
    prompt: "Reimagine the person to cosplay as a Naruto shinobi character with weapons, ninja accessories, outfit, and headband. Realistic 3D graphics rendered in Unreal Engine.",
    image_urls: ["blob:https://fal.ai/250ab1cc-007a-4762-b521-b42a26bcc4f3"],
    num_images: 3,
    output_format: "jpeg"
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});
console.log(result.data);
console.log(result.requestId);
```

# Player 1 rendered
Remove the background, turn left, facing left, fighting pose

```js
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/nano-banana/edit", {
  input: {
    prompt: "Remove the background, turn left, facing left, fighting pose",
    image_urls: ["blob:https://fal.ai/53a2f4ff-802e-486e-b257-a791b2c23998"],
    num_images: 3,
    output_format: "jpeg"
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});
console.log(result.data);
console.log(result.requestId);
```

# Player 2 rendered
Remove the background, turn right, facing right, fighting pose
```js
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/nano-banana/edit", {
  input: {
    prompt: "Remove the background, turn right, facing right, fighting pose",
    image_urls: ["blob:https://fal.ai/476733be-24e6-44d9-8878-b59f7becad7a"],
    num_images: 1,
    output_format: "jpeg"
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});
console.log(result.data);
console.log(result.requestId);
```