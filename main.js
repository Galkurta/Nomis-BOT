const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { DateTime } = require("luxon");
const colors = require("colors");
const readline = require("readline");
const winston = require("winston");

// Configure Winston logger with improved formatting
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss.SSS",
    }),
    winston.format.printf(({ timestamp, level, message }) => {
      const levelUpper = level.toUpperCase().padEnd(5);
      let coloredLevel;
      switch (level) {
        case "info":
          coloredLevel = colors.green(levelUpper);
          break;
        case "warn":
          coloredLevel = colors.yellow(levelUpper);
          break;
        case "error":
          coloredLevel = colors.red(levelUpper);
          break;
        default:
          coloredLevel = colors.white(levelUpper);
      }
      return `${colors.gray(timestamp)} ${coloredLevel}: ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

class Nomis {
  constructor() {
    this.currentAppInitData = "";
  }

  headers() {
    return {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain, */*",
      "Accept-Language":
        "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
      Authorization:
        "Bearer 8e25d2673c5025dfcd36556e7ae1b330095f681165fe964181b13430ddeb385a0844815b104eff05f44920b07c073c41ff19b7d95e487a34aa9f109cab754303cd994286af4bd9f6fbb945204d2509d4420e3486a363f61685c279ae5b77562856d3eb947e5da44459089b403eb5c80ea6d544c5aa99d4221b7ae61b5b4cbb55",
      Origin: "https://telegram.nomis.cc",
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
    const url = `https://cms-api.nomis.cc/api/users/farm-data?user_id=${id}`;
    const headers = this.headers(false);
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
    logger.info(colors.blue("Checking task list"));
    const config = {
      url,
      method: "get",
      headers,
    };
    return this.request(config);
  }

  async kiemtraTask(id) {
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
    const url = `https://cms-api.nomis.cc/api/users/referrals-data?user_id=${user_id}`;
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

  async waitWithCountdown(seconds) {
    const formatTime = (totalSeconds) => {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };

    for (let i = seconds; i >= 0; i--) {
      readline.cursorTo(process.stdout, 0);
      readline.clearLine(process.stdout, 0);
      if (i > 0) {
        process.stdout.write(
          colors.cyan(
            `Completed all accounts, waiting ${formatTime(
              i
            )} to continue the loop`
          )
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.log(colors.green("\nResuming operations..."));
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
          logger.error(`Invalid app init data for entry ${no + 1}`);
          continue;
        }

        const [, telegram_user_id, telegram_username] = userMatch;
        const referrer = "Lndkhu-VNo";
        try {
          const authResponse = await this.auth(
            telegram_user_id,
            telegram_username,
            referrer
          );
          const profileData = authResponse.data;
          if (profileData && profileData.id) {
            const userId = profileData.id;

            logger.info(
              colors.cyan(`Account ${no + 1} | ${telegram_username}`)
            );

            const farmDataResponse = await this.getProfile(userId);
            const farmData = farmDataResponse.data;
            const points = farmData.points / 1000;
            const nextfarm = farmData.nextFarmClaimAt;

            logger.info(`Balance: ${colors.yellow(points)}`);
            let claimFarmSuccess = false;

            if (nextfarm) {
              const nextFarmLocal = DateTime.fromISO(nextfarm, {
                zone: "utc",
              }).setZone(DateTime.local().zoneName);
              logger.info(
                `Farm completion time: ${colors.magenta(
                  nextFarmLocal.toLocaleString(DateTime.DATETIME_FULL)
                )}`
              );
              if (no === 0) {
                firstFarmCompleteTime = nextFarmLocal;
              }
              const now = DateTime.local();
              if (now > nextFarmLocal) {
                try {
                  await this.claimFarm(userId);
                  logger.info(colors.green("Farm claim successful!"));
                  claimFarmSuccess = true;
                } catch (claimError) {
                  logger.error(claimError);
                  logger.error(colors.red("Error when claiming farm!"));
                }
              }
            } else {
              claimFarmSuccess = true;
            }

            if (claimFarmSuccess) {
              try {
                await this.startFarm(userId);
                logger.info(colors.green("Farm start successful!"));
              } catch (startError) {
                logger.error(colors.red("Error when starting farm!"));
              }
            }

            try {
              const getTaskResponse = await this.getTask(userId);
              const tasks = getTaskResponse.data;

              const kiemtraTaskResponse = await this.kiemtraTask(userId);
              const completedTasks = kiemtraTaskResponse.data.flatMap(
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
                const result = await this.claimTask(userId, task.id);
                logger.info(
                  `Doing task ${colors.cyan(
                    task.title
                  )} | Status: ${colors.green("Completed")}`
                );
              }
            } catch (taskError) {
              logger.error(colors.red("Error when doing task"));
              logger.error(taskError);
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
                  logger.info(
                    `Next referrals claim time: ${colors.magenta(
                      nextReferralsClaimLocal.toLocaleString(
                        DateTime.DATETIME_FULL
                      )
                    )}`
                  );

                  const now = DateTime.local();
                  if (now > nextReferralsClaimLocal) {
                    const claimResponse = await this.claimReferral(userId);
                    if (claimResponse.data.result) {
                      logger.info(colors.green("Referrals claim successful!"));
                    } else {
                      logger.error(colors.red("Referrals claim failed!"));
                    }
                  }
                } else {
                  logger.info(colors.yellow("Performing claim"));
                  const claimResponse = await this.claimReferral(userId);
                  if (claimResponse.data.result) {
                    logger.info(colors.green("Referrals claim successful!"));
                  } else {
                    logger.error(colors.red("Referrals claim failed!"));
                  }
                }
              } else {
                logger.warn(colors.yellow("No available referrals to claim"));
              }
            } catch (error) {
              logger.error(colors.red("Error when processing referrals"));
              logger.error(error);
            }
          } else {
            logger.error(colors.red("Error: User ID not found"));
          }
        } catch (error) {
          logger.error(colors.red("Error when processing account"));
          logger.error(error);
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
      await this.waitWithCountdown(waitTime);
    }
  }
}

if (require.main === module) {
  const dancay = new Nomis();
  dancay.main().catch((err) => {
    logger.error(err);
    process.exit(1);
  });
}
