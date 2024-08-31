const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { DateTime } = require("luxon");
const colors = require("colors");
const readline = require("readline");

class Nomis {
  constructor() {
    this.currentAppInitData = "";
  }

  headers(includeAppInitData = true) {
    const baseHeaders = {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      Authorization:
        "Bearer 8e25d2673c5025dfcd36556e7ae1b330095f681165fe964181b13430ddeb385a0844815b104eff05f44920b07c073c41ff19b7d95e487a34aa9f109cab754303cd994286af4bd9f6fbb945204d2509d4420e3486a363f61685c279ae5b77562856d3eb947e5da44459089b403eb5c80ea6d544c5aa99d4221b7ae61b5b4cbb55",
      "Content-Type": "application/json",
      Origin: "https://telegram.nomis.cc",
      Referer: "https://telegram.nomis.cc/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    };

    if (includeAppInitData) {
      baseHeaders["X-App-Init-Data"] = this.currentAppInitData;
    }

    return baseHeaders;
  }

  async auth(telegram_user_id, telegram_username, referrer) {
    const url = "https://cms-tg.nomis.cc/api/ton-twa-users/auth/";
    const headers = this.headers();
    const payload = { telegram_user_id, telegram_username, referrer };
    return axios.post(url, payload, { headers });
  }

  async getProfile(id) {
    const url = `https://cms-api.nomis.cc/api/users/farm-data?user_id=${id}`;
    const headers = this.headers(false);
    return axios.get(url, { headers });
  }

  async getTask(id) {
    const url = `https://cms-tg.nomis.cc/api/ton-twa-tasks/by-groups?user_id=${id}`;
    const headers = this.headers();
    return axios.get(url, { headers });
  }

  async checkCompletedTasks(id) {
    const url = `https://cms-tg.nomis.cc/api/ton-twa-tasks/by-groups?user_id=${id}&completed=true`;
    const headers = this.headers();
    return axios.get(url, { headers });
  }

  async claimTask(user_id, task_id) {
    const url = `https://cms-tg.nomis.cc/api/ton-twa-user-tasks/verify`;
    const headers = this.headers();
    const payload = { task_id, user_id };
    return axios.post(url, payload, { headers });
  }

  async claimFarm(user_id) {
    const url = `https://cms-tg.nomis.cc/api/ton-twa-users/claim-farm`;
    const headers = this.headers();
    const payload = { user_id };
    return axios.post(url, payload, { headers });
  }

  async startFarm(user_id) {
    const url = `https://cms-tg.nomis.cc/api/ton-twa-users/start-farm`;
    const headers = this.headers();
    const payload = { user_id };
    return axios.post(url, payload, { headers });
  }

  async getReferralData(user_id) {
    const url = `https://cms-api.nomis.cc/api/users/referrals-data?user_id=${user_id}`;
    const headers = this.headers();
    return axios.get(url, { headers });
  }

  async claimReferral(user_id) {
    const url = `https://cms-tg.nomis.cc/api/ton-twa-users/claim-referral`;
    const headers = this.headers();
    const payload = { user_id };
    return axios.post(url, payload, { headers });
  }

  log(msg, type = "info") {
    const types = {
      info: colors.cyan,
      success: colors.green,
      warning: colors.yellow,
      error: colors.red,
      task: colors.magenta,
    };
    console.log(types[type](msg));
  }

  formatNumber(num) {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, "0")} Hours ${minutes
      .toString()
      .padStart(2, "0")} Minutes ${remainingSeconds
      .toString()
      .padStart(2, "0")} Seconds`;
  }

  async waitWithCountdown(seconds) {
    return new Promise((resolve) => {
      let remainingTime = seconds;
      const intervalId = setInterval(() => {
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(`Waiting ${this.formatDuration(remainingTime)}`);
        remainingTime--;
        if (remainingTime < 0) {
          clearInterval(intervalId);
          console.log("\n"); // Move to the next line after countdown
          resolve();
        }
      }, 1000);
    });
  }

  async main() {
    const dataFile = path.join(__dirname, "data.txt");
    const data = fs
      .readFileSync(dataFile, "utf8")
      .replace(/\r/g, "")
      .split("\n")
      .filter(Boolean);

    let firstFarmCompleteTime = null;

    while (true) {
      for (let no = 0; no < data.length; no++) {
        const appInitData = data[no];
        this.currentAppInitData = appInitData;

        const userMatch = appInitData.match(
          /user=%7B%22id%22%3A(\d+).*?%22username%22%3A%22(.*?)%22/
        );
        if (!userMatch) {
          console.log(colors.red(`Invalid app init data for entry ${no + 1}`));
          continue;
        }

        const [, telegram_user_id, telegram_username] = userMatch;
        const referrer = "FTnENEBJKR"; // refcode

        try {
          const authResponse = await this.auth(
            telegram_user_id,
            telegram_username,
            referrer
          );
          const profileData = authResponse.data;
          if (profileData && profileData.id) {
            const userId = profileData.id;

            console.log(
              colors.cyan(`[ Account ${no + 1} ${telegram_username} ]`)
            );

            const farmDataResponse = await this.getProfile(userId);
            const farmData = farmDataResponse.data;
            const points = farmData.points / 1000;
            const nextfarm = farmData.nextFarmClaimAt;

            this.log(`Balance ${this.formatNumber(points)}`, "info");

            if (nextfarm) {
              const nextFarmLocal = DateTime.fromISO(nextfarm, {
                zone: "utc",
              }).setZone(DateTime.local().zoneName);
              this.log(
                `Next farm ${nextFarmLocal.toLocaleString(
                  DateTime.DATETIME_SHORT
                )}`,
                "info"
              );
              if (no === 0) {
                firstFarmCompleteTime = nextFarmLocal;
              }
              const now = DateTime.local();
              if (now > nextFarmLocal) {
                try {
                  await this.claimFarm(userId);
                  this.log(`Farm claimed successfully`, "success");
                  await this.startFarm(userId);
                  this.log(`Farm started successfully`, "success");
                } catch (farmError) {
                  this.log(`Error managing farm`, "error");
                }
              }
            }

            try {
              const getTaskResponse = await this.getTask(userId);
              const tasks = getTaskResponse.data;

              const checkCompletedTasksResponse =
                await this.checkCompletedTasks(userId);
              const completedTasks = checkCompletedTasksResponse.data.flatMap(
                (taskGroup) => taskGroup.ton_twa_tasks
              );

              const completedTaskIds = new Set(
                completedTasks.map((task) => task.id)
              );

              const pendingTasks = tasks
                .flatMap((taskGroup) => taskGroup.ton_twa_tasks)
                .filter(
                  (task) =>
                    task.reward > 0 &&
                    !completedTaskIds.has(task.id) &&
                    !["telegramAuth", "pumpersToken", "pumpersTrade"].includes(
                      task.handler
                    )
                );

              for (const task of pendingTasks) {
                await this.claimTask(userId, task.id);
                this.log(`‣ Task ${task.title}`, "task");
              }
            } catch (taskError) {
              this.log(`Error processing tasks`, "error");
            }

            try {
              const referralDataResponse = await this.getReferralData(userId);
              const referralData = referralDataResponse.data;
              if (referralData && referralData.claimAvailable > 0) {
                if (referralData.nextReferralsClaimAt) {
                  const nextReferralsClaimLocal = DateTime.fromISO(
                    referralData.nextReferralsClaimAt,
                    { zone: "utc" }
                  ).setZone(DateTime.local().zoneName);
                  this.log(
                    `Next referral ${nextReferralsClaimLocal.toLocaleString(
                      DateTime.DATETIME_SHORT
                    )}`,
                    "info"
                  );

                  const now = DateTime.local();
                  if (now > nextReferralsClaimLocal) {
                    const claimResponse = await this.claimReferral(userId);
                    if (claimResponse.data.result) {
                      this.log(`Referrals claimed successfully`, "success");
                    } else {
                      this.log(`Failed to claim referrals`, "error");
                    }
                  }
                } else {
                  const claimResponse = await this.claimReferral(userId);
                  if (claimResponse.data.result) {
                    this.log(`Referrals claimed successfully`, "success");
                  } else {
                    this.log(`Failed to claim referrals`, "error");
                  }
                }
              } else {
                this.log(`No referrals to claim`, "warning");
              }
            } catch (error) {
              this.log(`Error processing referrals`, "error");
            }

            console.log(""); // Add a blank line between accounts for better readability
          } else {
            this.log(`Error User ID not found`, "error");
          }
        } catch (error) {
          this.log(`Error processing account`, "error");
        }
      }

      let waitTime;
      if (firstFarmCompleteTime) {
        const now = DateTime.local();
        const diff = firstFarmCompleteTime.diff(now, "seconds").seconds;
        waitTime = Math.max(0, Math.floor(diff));
      } else {
        waitTime = 15 * 60;
      }
      await this.waitWithCountdown(waitTime);
    }
  }
}

if (require.main === module) {
  const nomisInstance = new Nomis();
  nomisInstance.main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
