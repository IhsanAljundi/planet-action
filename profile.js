async function fetchUserData() {
  const token = localStorage.getItem("idToken");
  if (!token) return alert("You're not authenticated!");

  const headers = { "Content-Type": "application/json" };
  try {
    const userDataBody = { idToken: token };
    const userDataRes = await fetch(USER_DATA_URL, {
      method: "POST",
      body: JSON.stringify(userDataBody),
      headers,
    });

    const userData = await userDataRes.json();
    if (userData.error) throw new Error(userData.error.message);
    if (!userData.users || userData.users.length <= 0) throw new Error();

    const { localId } = userData.users[0];
    const userDetailsRes = await fetch(`${FIRESTORE_URL}/users/${localId}`, {
      method: "GET",
      headers,
    });

    const userDetails = await userDetailsRes.json();
    if (userDetails.error) throw new Error(userDetails.error.message);
    if (!userDetails.fields) throw new Error();

    const { avatar, username } = userDetails.fields;
    document.getElementById("nav-username").innerText = username.stringValue;
    document.getElementById("nav-avatar").src = avatar.stringValue;
  } catch (e) {
    console.error("Error in fetchUserData():", e);
  }
}

async function fetchPosts() {
  const token = localStorage.getItem("idToken");
  if (!token) return alert("You're not authenticated!");

  const headers = { "Content-Type": "application/json" };
  try {
    const query = {
      structuredQuery: {
        from: [{ collectionId: "posts" }],
        orderBy: [
          {
            field: { fieldPath: "timestamp" },
            direction: "DESCENDING",
          },
        ],
      },
    };

    const res = await fetch(`${FIRESTORE_URL}:runQuery`, {
      method: "POST",
      body: JSON.stringify(query),
      headers,
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    const container = document.getElementById("posts-list");
    data.forEach(async (post) => {
      const id = post.document.name.split("/").at(-1);
      const { uid, cover, title, description, tags, likes } =
        post.document.fields;

      const userRes = await fetch(`${FIRESTORE_URL}/users/${uid.stringValue}`, {
        method: "GET",
        headers,
      });

      let avatar, username;
      const user = await userRes.json();
      if (!user.error && user.fields) {
        avatar = user.fields.avatar;
        username = user.fields.username;
      }

      const template = document.querySelector(".post-template").cloneNode(true);

      template.style = "";
      template.querySelector(".post-template-date").textContent = new Date(
        post.document.createTime
      ).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      if (cover) {
        template.querySelector(".post-template-image").src = cover.stringValue;
      }

      template.querySelector(".post-template-title").textContent =
        title.stringValue;
      template.querySelector(".post-template-description").innerHTML =
        description.stringValue.replace(/\\n/g, "<br>");

      const tagTemplate = `<a class="post-template badge bg-primary p-2 link-light" href="#">#{TAG}</a>`;
      template.querySelector(".post-template-tags-list").innerHTML =
        tags.arrayValue.values
          .map((tag) => tagTemplate.replace("{TAG}", tag.stringValue))
          .join("");

      if (avatar) {
        template.querySelector(".post-template-avatar").src =
          avatar.stringValue;
      }

      if (username) {
        template.querySelector(".post-template-username").textContent =
          username.stringValue;
      }

      template.querySelector(".post-template-likes").dataset.id = id;
      template.querySelector(".post-template-likes").textContent =
        likes.integerValue;

      template.querySelector(".post-template-like-button").dataset.id = id;
      template
        .querySelector(".post-template-like-button")
        .addEventListener("click", likePost);

      container.appendChild(template);
    });
  } catch (e) {
    console.error("Error in fetchPosts():", e);
  }
}