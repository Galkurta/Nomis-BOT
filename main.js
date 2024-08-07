const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { DateTime } = require('luxon');
const colors = require('colors');
const readline = require('readline');

class Nomis {
    constructor() {
        this.currentAppInitData = '';
        this.autoClaimTasks = false; // Set this to true for auto-claiming tasks
    }

    headers() {
        return {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en;q=0.5",
            "Authorization": "Bearer 8e25d2673c5025dfcd36556e7ae1b330095f681165fe964181b13430ddeb385a0844815b104eff05f44920b07c073c41ff19b7d95e487a34aa9f109cab754303cd994286af4bd9f6fbb945204d2509d4420e3486a363f61685c279ae5b77562856d3eb947e5da44459089b403eb5c80ea6d544c5aa99d4221b7ae61b5b4cbb55",
            "Content-Type": "application/json",
            "Origin": "https://telegram.nomis.cc",
            "Priority": "u=1, i",
            "Referer": "https://telegram.nomis.cc/",
            "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
            "Sec-Ch-Ua-Mobile": "?1",
            "Sec-Ch-Ua-Platform": '"Android"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
            "X-App-Init-Data": this.currentAppInitData
        }
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
            referrer
        };
        const config = {
            url,
            method: 'post',
            headers,
            data: payload
        };
        return this.request(config);
    }

    async getProfile(id) {
        const url = `https://cms-tg.nomis.cc/api/ton-twa-users/farm-data?user_id=${id}`;
        const headers = this.headers();
        const config = {
            url,
            method: 'get',
            headers
        };
        return this.request(config);
    }

    async getTask(id) {
        const url = `https://cms-tg.nomis.cc/api/ton-twa-tasks/by-groups?user_id=${id}`;
        const headers = this.headers();
        this.log(`Checking task list...`.green);
        const config = {
            url,
            method: 'get',
            headers
        };
        return this.request(config);
    }

    async checkTask(id) {
        const url = `https://cms-tg.nomis.cc/api/ton-twa-tasks/by-groups?user_id=${id}&completed=true`;
        const headers = this.headers();
        const config = {
            url,
            method: 'get',
            headers
        };
        return this.request(config);
    }

    async claimTask(user_id, task_id) {
        const url = `https://cms-tg.nomis.cc/api/ton-twa-user-tasks/verify`;
        const headers = this.headers();
        const payload = {
            task_id,
            user_id
        };
        const config = {
            url,
            method: 'post',
            headers,
            data: payload
        };
        return this.request(config);
    }

    async claimFarm(user_id) {
        const url = `https://cms-tg.nomis.cc/api/ton-twa-users/claim-farm`;
        const headers = this.headers();
        const payload = { user_id };
        const config = {
            url,
            method: 'post',
            headers,
            data: payload
        };
        return this.request(config);
    }

    async startFarm(user_id) {
        const url = `https://cms-tg.nomis.cc/api/ton-twa-users/start-farm`;
        const headers = this.headers();
        const payload = { user_id };
        const config = {
            url,
            method: 'post',
            headers,
            data: payload
        };
        return this.request(config);
    }

    async getReferralData(user_id) {
        const url = `https://cms-tg.nomis.cc/api/ton-twa-users/referrals-data?user_id=${user_id}`;
        const headers = this.headers();
        const config = {
            url,
            method: 'get',
            headers
        };
        return this.request(config);
    }

    async claimReferral(user_id) {
        const url = `https://cms-tg.nomis.cc/api/ton-twa-users/claim-referral`;
        const headers = this.headers();
        const payload = { user_id };
        const config = {
            url,
            method: 'post',
            headers,
            data: payload
        };
        return this.request(config);
    }

    log(msg) {
        console.log(`${msg}`);
    }

    async waitWithCountdown(seconds) {
        const endTime = DateTime.local().plus({ seconds });
        while (seconds >= 0) {
            readline.cursorTo(process.stdout, 0);
            const now = DateTime.local();
            const remaining = endTime.diff(now, ['hours', 'minutes', 'seconds']).toObject();
            const hours = String(Math.floor(remaining.hours)).padStart(2, '0');
            const minutes = String(Math.floor(remaining.minutes)).padStart(2, '0');
            const sec = String(Math.floor(remaining.seconds)).padStart(2, '0');
            process.stdout.write(`===== All accounts completed, waiting ${hours}:${minutes}:${sec} to continue the loop =====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            seconds--;
        }
        console.log('');
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        let firstFarmCompleteTime = null;

        while (true) {
            for (let no = 0; no < data.length; no++) {
                const appInitData = data[no];
                this.currentAppInitData = appInitData;

                const userMatch = appInitData.match(/user=%7B%22id%22%3A(\d+).*?%22username%22%3A%22(.*?)%22/);
                if (!userMatch) {
                    console.log(`Invalid app init data for entry ${no + 1}`);
                    continue;
                }

                const [, telegram_user_id, telegram_username] = userMatch;
                const referrer = "Lndkhu-VNo";
                try {
                    const authResponse = await this.auth(telegram_user_id, telegram_username, referrer);
                    const profileData = authResponse.data;

                    if (profileData && profileData.id) {
                        const userId = profileData.id;

                        console.log(`========== Account ${no + 1} | ${telegram_username.green} ==========`);

                        const farmDataResponse = await this.getProfile(userId);
                        const farmData = farmDataResponse.data;
                        const points = farmData.points / 1000;
                        const nextfarm = farmData.nextFarmClaimAt;

                        this.log(`Balance: ${points}`.green);
                        let claimFarmSuccess = false;

                        if (nextfarm) {
                            const nextFarmLocal = DateTime.fromISO(nextfarm, { zone: 'utc' }).setZone(DateTime.local().zoneName);
                            this.log(`Next farm completion time: ${nextFarmLocal.toLocaleString(DateTime.DATETIME_FULL)}`.green);
                            if (no === 0) {
                                firstFarmCompleteTime = nextFarmLocal;
                            }
                            const now = DateTime.local();
                            if (now > nextFarmLocal) {
                                try {
                                    await this.claimFarm(userId);
                                    this.log(`Claim farm successful!`.green);
                                    claimFarmSuccess = true;
                                } catch (claimError) {
                                    console.log(claimError);
                                    this.log(`Error claiming farm!`.red);
                                }
                            }
                        } else {
                            claimFarmSuccess = true;
                        }

                        if (claimFarmSuccess) {
                            try {
                                await this.startFarm(userId);
                                this.log(`Start farm successful!`.green);
                            } catch (startError) {
                                this.log(`Error starting farm!`.red);
                            }
                        }

                        if (this.autoClaimTasks) {
                            try {
                                const getTaskResponse = await this.getTask(userId);
                                const tasks = getTaskResponse.data;

                                const checkTaskResponse = await this.checkTask(userId);
                                const completedTasks = checkTaskResponse.data.flatMap(taskGroup => taskGroup.ton_twa_tasks);

                                const completedTaskIds = new Set(completedTasks.map(task => task.id));

                                const pendingTasks = tasks.flatMap(taskGroup => taskGroup.ton_twa_tasks)
                                    .filter(task => 
                                        task.reward > 0 && 
                                        !completedTaskIds.has(task.id) &&
                                        !['telegramAuth', 'pumpersToken', 'pumpersTrade'].includes(task.handler)
                                    );

                                for (const task of pendingTasks) {
                                    this.log(`Executing task: ${task.name} | ${task.group_name}`.green);

                                    try {
                                        await this.claimTask(userId, task.id);
                                        this.log(`Task claim successful!`.green);
                                    } catch (claimError) {
                                        this.log(`Error claiming task!`.red);
                                    }
                                }
                            } catch (taskError) {
                                this.log(`Error executing tasks!`.red);
                            }
                        }

                        try {
                            const referralDataResponse = await this.getReferralData(userId);
                            const referralData = referralDataResponse.data;

                            if (referralData.referrals_count > 0) {
                                await this.claimReferral(userId);
                                this.log(`Claim referral successful!`.green);
                            }
                        } catch (referralError) {
                            this.log(`Error claiming referral!`.red);
                        }
                    } else {
                        console.log(`Error authenticating user ID ${telegram_user_id}`);
                    }
                } catch (authError) {
                    console.log(authError);
                    this.log(`Error during authentication for account ${no + 1}`.red);
                }

                this.log(`\n`);
            }

            if (firstFarmCompleteTime) {
                const now = DateTime.local();
                const waitSeconds = firstFarmCompleteTime.diff(now, 'seconds').seconds;
                if (waitSeconds > 0) {
                    await this.waitWithCountdown(waitSeconds);
                }
            } else {
                await this.waitWithCountdown(3600);
            }
        }
    }
}

new Nomis().main().then(r => {});