# Person -> Character

Reimagine the person to cosplay as a Naruto shinobi character with weapons, ninja accessories, outfit, and headband. Realistic 3D graphics rendered in Unreal Engine.

```js
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/nano-banana/edit", {
  input: {
    prompt: "Reimagine the person to cosplay as a Naruto shinobi character with weapons, ninja accessories, outfit, and headband. Realistic 3D graphics rendered in Unreal Engine.",
    image_urls: ["blob:https://fal.ai/250ab1cc-007a-4762-b521-b42a26bcc4f3"], // i.e. alex.jpeg or richa.jpeg
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

# Player 1 rendered
Remove the background, turn right, facing right, fighting pose

```js
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/nano-banana/edit", {
  input: {
    prompt: "Remove the background, turn right, facing right, fighting pose",
    image_urls: ["blob:https://fal.ai/53a2f4ff-802e-486e-b257-a791b2c23998"], // player_1_model.jpeg
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

# Player 2 rendered
Remove the background, turn left, facing left, fighting pose
```js
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/nano-banana/edit", {
  input: {
    prompt: "Remove the background, turn left, facing left, fighting pose",
    image_urls: ["blob:https://fal.ai/476733be-24e6-44d9-8878-b59f7becad7a"], // player_2_model.jpeg
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


# Versus Screen
```js
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/nano-banana/edit", {
  input: {
    prompt: "Show the characters posing with a lightning bolt splitting the screen in 2 saying VS, as they prepare to fight",
    image_urls: ["blob:https://fal.ai/3bb18614-615a-4738-9772-6ef85081b97e", "blob:https://fal.ai/bc45d3cf-9c2b-433b-9917-9706fdce61d1", "blob:https://fal.ai/4228713a-cdb9-423c-98df-47b65f1d572c"], // player_1_model.jpeg, vs.jpeg, player_2_model.jpeg
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

# Battle Arena start
```js
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/nano-banana/edit", {
  input: {
    prompt: "Move the characters to far end opposite sides of the arena preparing to fight each other. FIGHT in the middle on top of screen",
    image_urls: ["blob:https://fal.ai/59a17f20-5421-4ee9-8d17-1dfb7e4436ae", "blob:https://fal.ai/298953e5-b021-4651-b423-a1aabeb51717", "blob:https://fal.ai/885c15bd-7e86-4173-a522-aaf5f687f50d", "blob:https://fal.ai/f1b24d2d-74e1-4c55-881b-272b345ed95b"], // arena.jpg, player_1_facing_right.jpeg, fight.png, player_2_facing_left.jpeg
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

# Winner pose
```js
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/nano-banana/edit", {
  input: {
    prompt: "Player 2 stands victorious. Player 1 looks sad and defeated. Arcade title text says Player 2 Wins!",
    image_urls: ["blob:https://fal.ai/47ea459a-b1d8-4a83-888b-cd4c46dc46d6"],
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