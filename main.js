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

  headers() {
    return {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9",
      Authorization:
        "Bearer 8e25d2673c5025dfcd36556e7ae1b330095f681165fe964181b13430ddeb385a0844815b104eff05f44920b07c073c41ff19b7d95e487a34aa9f109cab754303cd994286af4bd9f6fbb945204d2509d4420e3486a363f61685c279ae5b77562856d3eb947e5da44459089b403eb5c80ea6d544c5aa99d4221b7ae61b5b4cbb55",
      "Content-Type": "application/json",
      Origin: "https://telegram.nomis.cc",
      Priority: "u=1, i",
      Referer: "https://telegram.nomis.cc/",
      "Sec-Ch-Ua":
        '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      "X-App-Init-Data": this.currentAppInitData,
    };
  }

  async request(config) {
    return axios(config);
  }

  async auth(telegram_user_id, telegram_username, referrer) {
    const url = "https://cms-tg.nomis.cc/api/ton-twa-users/auth/";
    const headers = this.headers();
    const payload = {
      telegram_user_id,
      telegram_username,
      referrer,
    };
    const config = {
      url,
      method: "post",
      headers,
      data: payload,
    };
    return this.request(config);
  }

  async getProfile(id) {
    const url = `https://cms-tg.nomis.cc/api/ton-twa-users/farm-data?user_id=${id}`;
    const headers = this.headers();
    const config = {
      url,
      method: "get",
      headers,
    };
    return this.request(config);
  }

  async getTask(id) {
    const url = `https://cms-tg.nomis.cc/api/ton-twa-tasks/by-groups?user_id=${id}`;
    const headers = this.headers();
    const config = {
      url,
      method: "get",
      headers,
    };
    return this.request(config);
  }

  async checkTask(id) {
    const url = `https://cms-tg.nomis.cc/api/ton-twa-tasks/by-groups?user_id=${id}&completed=true`;
    const headers = this.headers();
    const config = {
      url,
      method: "get",
      headers,
    };
    return this.request(config);
  }

  async claimTask(user_id, task_id) {
    const url = `https://cms-tg.nomis.cc/api/ton-twa-user-tasks/verify`;
    const headers = this.headers();
    const payload = {
      task_id,
      user_id,
    };
    const config = {
      url,
      method: "post",
      headers,
      data: payload,
    };
    return this.request(config);
  }

  async claimFarm(user_id) {
    const url = `https://cms-tg.nomis.cc/api/ton-twa-users/claim-farm`;
    const headers = this.headers();
    const payload = { user_id };
    const config = {
      url,
      method: "post",
      headers,
      data: payload,
    };
    return this.request(config);
  }

  async startFarm(user_id) {
    const url = `https://cms-tg.nomis.cc/api/ton-twa-users/start-farm`;
    const headers = this.headers();
    const payload = { user_id };
    const config = {
      url,
      method: "post",
      headers,
      data: payload,
    };
    return this.request(config);
  }

  async getReferralData(user_id) {
    const url = `https://cms-tg.nomis.cc/api/ton-twa-users/referrals-data?user_id=${user_id}`;
    const headers = this.headers();
    const config = {
      url,
      method: "get",
      headers,
    };
    return this.request(config);
  }

  async claimReferral(user_id) {
    const url = `https://cms-tg.nomis.cc/api/ton-twa-users/claim-referral`;
    const headers = this.headers();
    const payload = { user_id };
    const config = {
      url,
      method: "post",
      headers,
      data: payload,
    };
    return this.request(config);
  }

  log(msg, indent = 0) {
    const indentStr = "  ".repeat(indent);
    console.log(`${indentStr}${msg}`);
  }

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    let timeString = "";
    if (hours > 0) timeString += `${hours}h `;
    if (minutes > 0 || hours > 0) timeString += `${minutes}m `;
    timeString += `${remainingSeconds}s`;

    return timeString.trim();
  }

  async animatedCountdown(seconds) {
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let frameIndex = 0;
    const startTime = Date.now();
    const endTime = startTime + seconds * 1000;

    while (Date.now() < endTime) {
      const remainingSeconds = Math.ceil((endTime - Date.now()) / 1000);
      const formattedTime = this.formatTime(remainingSeconds);

      readline.cursorTo(process.stdout, 0);
      process.stdout.write(
        `${frames[frameIndex]} Waiting ${formattedTime} to continue the loop`
      );

      frameIndex = (frameIndex + 1) % frames.length;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.log("\nResuming operations...");
  }

  formatNumber(num) {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
      console.log("=".repeat(50));
      console.log("Starting new iteration".cyan.bold);
      console.log("=".repeat(50));

      for (let no = 0; no < data.length; no++) {
        const appInitData = data[no];
        this.currentAppInitData = appInitData;

        const userMatch = appInitData.match(
          /user=%7B%22id%22%3A(\d+).*?%22username%22%3A%22(.*?)%22/
        );
        if (!userMatch) {
          console.log(`Invalid app init data for entry ${no + 1}`);
          continue;
        }

        const [, telegram_user_id, telegram_username] = userMatch;
        const referrer = "Lndkhu-VNo"; // refcode

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
              `\n${"►".cyan} Account ${(no + 1).toString().cyan}: ${
                telegram_username.green
              }`
            );

            const farmDataResponse = await this.getProfile(userId);
            const farmData = farmDataResponse.data;
            const points = farmData.points / 1000;
            const nextfarm = farmData.nextFarmClaimAt;

            this.log(`Balance: ${this.formatNumber(points).yellow}`, 1);
            let claimFarmSuccess = false;

            if (nextfarm) {
              const nextFarmLocal = DateTime.fromISO(nextfarm, {
                zone: "utc",
              }).setZone(DateTime.local().zoneName);
              this.log(
                `Next farm: ${
                  nextFarmLocal.toLocaleString(DateTime.DATETIME_FULL).magenta
                }`,
                1
              );
              if (no === 0) {
                firstFarmCompleteTime = nextFarmLocal;
              }
              const now = DateTime.local();
              if (now > nextFarmLocal) {
                try {
                  await this.claimFarm(userId);
                  this.log(`Farm claim: ${"SUCCESS".green}`, 1);
                  claimFarmSuccess = true;
                } catch (claimError) {
                  this.log(`Farm claim: ${"FAILED".red}`, 1);
                }
              }
            } else {
              claimFarmSuccess = true;
            }

            if (claimFarmSuccess) {
              try {
                await this.startFarm(userId);
                this.log(`Farm start: ${"SUCCESS".green}`, 1);
              } catch (startError) {
                this.log(`Farm start: ${"FAILED".red}`, 1);
              }
            }

            try {
              const getTaskResponse = await this.getTask(userId);
              const tasks = getTaskResponse.data;

              const checkTaskResponse = await this.checkTask(userId);
              const completedTasks = checkTaskResponse.data.flatMap(
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

              if (pendingTasks.length > 0) {
                this.log("Tasks:", 1);
                for (const task of pendingTasks) {
                  const result = await this.claimTask(userId, task.id);
                  this.log(`• ${task.title}: ${"COMPLETED".green}`, 2);
                }
              } else {
                this.log("Tasks: No pending tasks", 1);
              }
            } catch (taskError) {
              this.log(`Tasks: ${"ERROR".red}`, 1);
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
                    `Next referral claim: ${
                      nextReferralsClaimLocal.toLocaleString(
                        DateTime.DATETIME_FULL
                      ).magenta
                    }`,
                    1
                  );

                  const now = DateTime.local();
                  if (now > nextReferralsClaimLocal) {
                    const claimResponse = await this.claimReferral(userId);
                    if (claimResponse.data.result) {
                      this.log(`Referral claim: ${"SUCCESS".green}`, 1);
                    } else {
                      this.log(`Referral claim: ${"FAILED".red}`, 1);
                    }
                  }
                } else {
                  this.log(`Referral claim: Attempting...`, 1);
                  const claimResponse = await this.claimReferral(userId);
                  if (claimResponse.data.result) {
                    this.log(`Referral claim: ${"SUCCESS".green}`, 1);
                  } else {
                    this.log(`Referral claim: ${"FAILED".red}`, 1);
                  }
                }
              } else {
                this.log(`Referral claim: ${"NOT AVAILABLE".yellow}`, 1);
              }
            } catch (error) {
              this.log(`Referral processing: ${"ERROR".red}`, 1);
            }
          } else {
            this.log(`${"ERROR".red}: User ID not found`, 1);
          }
        } catch (error) {
          this.log(`${"ERROR".red}: Failed to process account`, 1);
        }
      }

      let waitTime;
      if (firstFarmCompleteTime) {
        const now = DateTime.local();
        const diff = firstFarmCompleteTime.diff(now, "seconds").seconds;
        waitTime = Math.max(0, Math.ceil(diff));
      } else {
        waitTime = 15 * 60;
      }
      console.log("\n" + "=".repeat(50));
      await this.animatedCountdown(waitTime);
    }
  }
}

if (require.main === module) {
  const nomis = new Nomis();
  nomis.main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
