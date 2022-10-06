const apiUrl = "https://api.telegram.org/bot" + BOT_TOKEN + "/";

async function handleRequest(request) {
  const { pathname } = new URL(request.url);

  if (pathname === "/webhook/gitlab") {
    const { headers } = request
    const xGitLabEvent = headers.get("X-Gitlab-Event") || ""

    if (!xGitLabEvent || xGitLabEvent !== "Push Hook") {
      throw new Error("Not Gitlab Push Event")
    }

    const body = await readRequestBody(request)
    const webhook = JSON.parse(body)

    if (webhook.event_name !== "push") {
      throw new Error("Only Push event is supported")
    }

    console.log(await apiRequest("sendMessage", {
      "chat_id": CHAT_ID,
      "text": handleWebhookGitlab(webhook),
      "parse_mode": "HTML"
    }))

    return new Response("ok")
  }

  return new Response("1");
}

async function apiRequest(method, parameters) {
  if (typeof method !== 'string' && !(method instanceof String)) {
    throw new Error("Method name must be a string\n");
  }

  if (parameters == null) {
    parameters = {};
  } else if (typeof parameters !== 'object') {
    throw new Error("Parameters must be an array\n");
  }

  parameters["method"] = method;

  return await execRequest(parameters);
}

function handleWebhookGitlab(wh) {
  // function ported from https://github.com/integram-org/gitlab/blob/7d9680f1068066442e34fcc91a3124b20c09a4a1/gitlab.go#L577
  let s = wh.ref.split('/')
  let branch = s.at(-1)
  let text = ""

  let added = 0
  let removed = 0
  let modified = 0
  let anyOherPersonCommits = false

  for (const commit of wh.commits) {
    if (commit.author.email != wh.user_email && commit.author.name != wh.user_name) {
      anyOherPersonCommits = true
    }
  }
  for (const commit of wh.commits) {
    
    commit.message = commit.message.trim()
    if (anyOherPersonCommits) {
      text += "<b>" + commit.author.name + "</b>: "
    }
    text += `<a href="${commit.url}">${commit.message}</a>\n`
    added += commit.added.length
    removed += commit.removed.length
    modified += commit.modified.length
  }
  let f = ""
  if (modified > 0) {
    f += modified + " files modified"
  }

  if (added > 0) {
    if (f === "") {
      f += added + " files added"
    } else {
      f += " " + added + " added"
    }
  }

  if (removed > 0) {
    if (f === "") {
      f += removed + " files removed"
    } else {
      f += " " + removed + " removed"
    }
  }
  let wp = "" // web preview
  if (wh.commits.length > 1) {
    wp = `${wh.commits.length} commits \n` +
      `@<code>${wh.before.substr(0, 10)}</code> <a href="${wh.repository.homepage+"/compare/"+wh.before+"..."+wh.after}">...</a> @<code>${wh.after.substr(0, 10)}</code> \n` +
      `${f}`
  } else if (wh.commits.length === 1) {
    wp = `<a href="${wh.commits.at(0).url}">Commit</a> \n` +
    `@<code>${wh.after.substr(0, 10)}</code> \n` +
    `${f}`
  }

  if (wh.commits.length > 0) {
    
    let destStr = wh.project.path_with_namespace
    if (destStr == "") {
      destStr = wh.repository.name
    }
    
    text = `<b>${wh.user_name}</b> pushed to <a href = "${wh.repository.homepage+"/tree/"+encodeURIComponent(branch)}">${destStr}/${branch}</a> \n${text}`
  } else {
    if (wh.after !== "0000000000000000000000000000000000000000" && wh.after !== "") {
      text = `<b>${wh.user_name}</b> created branch <a href="${wh.repository.homepage+"/tree/"+encodeURIComponent(branch)}">${wh.repository.name}/${branch}</a> \n${text}`
    } else {
      text = `<b>${wh.user_name}</b> deleted branch <b>${wh.repository.name}/${branch}</b> \n${text}`
    }
  }

  return text + "\n" + wp
}

async function execRequest(body) {
  const init = {
    body: JSON.stringify(body),
    method: "POST",
    headers: {
      "content-type": "application/json;charset=UTF-8",
    },
  }

  const response = await fetch(apiUrl, init)
  const results = await gatherResponse(response)
  return results
}

async function readRequestBody(request) {
  const { headers } = request
  const contentType = headers.get("content-type") || ""

  if (contentType.includes("application/json")) {
    return JSON.stringify(await request.json())
  }
  else if (contentType.includes("application/text")) {
    return request.text()
  }
  else if (contentType.includes("text/html")) {
    return request.text()
  }
  else if (contentType.includes("form")) {
    const formData = await request.formData()
    const body = {}
    for (const entry of formData.entries()) {
      body[entry[0]] = entry[1]
    }
    return JSON.stringify(body)
  }
  else {
    // Perhaps some other type of data was submitted in the form
    // like an image, or some other binary data. 
    return 'a file';
  }
}

async function gatherResponse(response) {
  const { headers } = response
  const contentType = headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    return JSON.stringify(await response.json())
  }
  else if (contentType.includes("application/text")) {
    return response.text()
  }
  else if (contentType.includes("text/html")) {
    return response.text()
  }
  else {
    return response.text()
  }
}

addEventListener("fetch", (event) => {
  event.respondWith(
    handleRequest(event.request).catch(
      (err) => new Response(err.stack, { status: 500 })
    )
  );
});
