(function () {
    let users = [
        "freecodecamp",
        "fakeymcfake23k",
        "colinbenders",
        "adamkoebel",
        "kaypikefashion",
        "pianoimproman",
        "domesticdan",
        "annaprosser",
        "outside_the_vox",
        "fakeymcfake24k",
        "vinesauce",
        "sleightlymusical"
    ];
    let usersClean = [];
    let online = [];
    let offline = [];
    let tries = {};

    function setupDataStructs() {
        users = users.map(user => user.toLowerCase());
        users.forEach(user => (tries[user] = {
            users: 0,
            channels: 0,
            streams: 0
        }));
    }

    function* counter() {
        let i = 0;
        while (true) {
            yield i.toString();
            i++;
        }
    }

    let count = counter();

    function jsonP(url, callbackName) {
        let script = document.createElement("script");
        let callback = callbackName + count.next().value;

        function jCallback(r) {
            return response => { //arg length of 1 means a response was received, otherwise error reject
                arguments.length == 1 ? r(response) : r(arguments[1]);
                window[callback] = null;
                delete window[callback];
            };
        }
        return new Promise((resolve, reject) => {
            window[callback] = jCallback(resolve);
            script.onerror = jCallback(reject, "onerror");
            setTimeout(jCallback(reject, "timed out"), 5000);
            script.src = `${url}?callback=${callback}`;
            document.head.appendChild(script);
            script.remove();
        });
    }

    function addClass(list, className) {
        list.forEach(function (el) {
            if (!el.classList.contains(className)) el.classList.add(className);
        });
    }

    function removeClass(list, className) {
        list.forEach(function (el) {
            if (el.classList.contains(className)) el.classList.remove(className);
        });
    }
    //display user's div only if it's in specified array
    function setDisplay(userDivs, arr) {
        for (let i = 0; i < userDivs.length; ++i) {
            let curr = userDivs[i];
            arr.indexOf(curr.id) > -1 ?
                (curr.style.display = "block") :
                (curr.style.display = "none");
        }
    }

    function addRemoveClass(addArr, removeArr, className) {
        addClass(addArr, className);
        removeClass(removeArr, className);
    }

    function attachBtns() {
        let showAll = document.getElementById("all");
        let showOl = document.getElementById("online");
        let showOff = document.getElementById("offline");
        let userDivs = document.getElementsByClassName("users");

        showAll.onclick = function () {
            addRemoveClass([showAll], [showOl, showOff], "selected");
            setDisplay(userDivs, usersClean);
        };
        showOl.onclick = function () {
            addRemoveClass([showOl], [showAll, showOff], "selected");
            setDisplay(userDivs, online);
        };
        showOff.onclick = function () {
            addRemoveClass([showOff], [showOl, showAll], "selected");
            setDisplay(userDivs, offline);
        };
    }

    function makeDiv(user) {
        let div = document.createElement("div");
        let img = document.createElement("img");
        let a = document.createElement("a");
        let h2 = document.createElement("h2");
        let p = document.createElement("p");
        let circle = document.createElement("div");
        div.id = user.toLowerCase();
        div.classList.add("users");
        a.target = "_blank";
        circle.classList.add("circle");
        div.appendChild(img);
        a.appendChild(h2);
        div.appendChild(a);
        div.appendChild(circle);
        div.appendChild(p);
        document.getElementById("users").appendChild(div);
    }

    function processUsers(user, response) {
        if (!response.status) { //user is valid
            let div;
            makeDiv(user);
            div = document.getElementById(user);
            div.getElementsByTagName("img")[0].src = response.logo;
            div.getElementsByTagName("h2")[0].textContent = response.display_name;
            usersClean.push(user);
            tries[user]["users"] = 0;
            return "done";
        } else return null;
    }

    function processChannels(user, response) {
        let div = document.getElementById(user);
        let a = div.getElementsByTagName("a")[0];
        a.href = response.url;
        tries[user]["channels"] = 0;
    }

    function processStreams(user, response) {
        let div = document.getElementById(user);
        let circle = div.getElementsByClassName("circle")[0];
        let p = div.getElementsByTagName("p")[0];
        let stream = response.stream;
        if (stream === null) {
            p.textContent = "Offline";
            removeClass([circle], "blink");
            if (offline.indexOf(user) === -1) offline.push(user);
            if (online.indexOf(user) > -1) online.splice(online.indexOf(user), 1);
        } else {
            p.textContent = stream.channel.status;
            addClass([circle], "blink");
            if (online.indexOf(user) === -1) online.push(user);
            if (offline.indexOf(user) > -1) offline.splice(offline.indexOf(user), 1);
        }
        tries[user]["streams"] = 0;
    }

    function showError() {
        document.getElementById("error").style.display = "block";
        document.getElementById("container").style.display = "none";
        if (streamCheck) clearInterval(streamCheck);
    }

    function popUserData(user, reqType, callback) {
        let url = `https://wind-bow.gomix.me/twitch-api/${reqType}/${user}`;
        return jsonP(url, "parseData")
            .then(r => callback(user, r))
            .catch(err => {
                console.log(err, user, reqType);
                if (err === "onerror") showError();
                if (err === "timed out") {
                    if (tries[user][reqType] < 2) {
                        console.log("trying " + user + " " + reqType);
                        tries[user][reqType] += 1;
                        reqType !== "users" ?
                            popUserData(user, reqType, callback) :
                            processUserArr([user]);
                    } else showError();
                }
            });
    }

    async function processUserArr(userArr) {
        for (const user of userArr) {
            let state = await popUserData(user, "users", processUsers);
            if (state === "done") {
                popUserData(user, "channels", processChannels);
                popUserData(user, "streams", processStreams);
            }
        }
    }
    setupDataStructs();
    processUserArr(users);
    attachBtns();
    let streamCheck = setInterval(() => {
        usersClean.forEach(user => popUserData(user, "streams", processStreams));
    }, 10000);
})();