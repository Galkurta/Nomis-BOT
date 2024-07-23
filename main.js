const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { DateTime } = require('luxon');
const colors = require('colors');
const readline = require('readline');

class Nomis {
    headers() {
        return {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
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
            "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
        }
    }

    async auth(telegram_user_id, telegram_username, referrer) {
        const url = "https://cms-tg.nomis.cc/api/ton-twa-users/auth/";
        const headers = this.headers();
        const payload = {
            telegram_user_id,
            telegram_username,
            referrer
        };
        return axios.post(url, payload, { headers });
    }

    async getProfile(id) {
        const url = `https://cms-tg.nomis.cc/api/ton-twa-users/farm-data?user_id=${id}`;
        const headers = this.headers();
        return axios.get(url, { headers });
    }

    async getTask(id) {
        const url = `https://cms-tg.nomis.cc/api/ton-twa-tasks/by-groups?user_id=${id}`;
        const headers = this.headers();
        this.log(`Checking the task list...`.cyan);
        return axios.get(url, { headers });
    }

    async kiemtraTask(id) {
        const url = `https://cms-tg.nomis.cc/api/ton-twa-tasks/by-groups?user_id=${id}&completed=true`;
        const headers = this.headers();
        return axios.get(url, { headers });
    }

    async claimTask(user_id, task_id) {
        const url = `https://cms-tg.nomis.cc/api/ton-twa-user-tasks/verify`;
        const headers = this.headers();
        const payload = {
            task_id,
            user_id
        };
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
        const url = `https://cms-tg.nomis.cc/api/ton-twa-users/referrals-data?user_id=${user_id}`;
        const headers = this.headers();
        return axios.get(url, { headers });
    }

    async claimReferral(user_id) {
        const url = `https://cms-tg.nomis.cc/api/ton-twa-users/claim-referral`;
        const headers = this.headers();
        const payload = { user_id };
        return axios.post(url, payload, { headers });
    }

    log(msg) {
        console.log(`[*] ${msg}`);
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours}h ${minutes}m ${secs}s`;
    }

    async waitWithCountdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`==== Waiting ${this.formatTime(i)} to continue the loop ====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }

    formatToUTCPlus7(dateTime) {
        return dateTime.setZone('Asia/Jakarta').toLocaleString(DateTime.DATETIME_FULL);
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
                const [telegram_user_id, telegram_username] = data[no].split('|');
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

                        this.log(`${'Balance:'.green} ${points} points`);
                        let claimFarmSuccess = false;

                        if (nextfarm) {
                            const nextFarmLocal = DateTime.fromISO(nextfarm, { zone: 'utc' });
                            this.log(`${'Farm completion time:'.green} ${this.formatToUTCPlus7(nextFarmLocal)}`);
                            if (no === 0) {
                                firstFarmCompleteTime = nextFarmLocal;
                            }
                            const now = DateTime.local().setZone('Asia/Jakarta');
                            if (now > nextFarmLocal) {
                                try {
                                    await this.claimFarm(userId);
                                    this.log(`${'Claim Farm successfully!'.green}`);
                                    claimFarmSuccess = true;
                                } catch (claimError) {
                                    this.log(`${'Error when Claim Farm!'.red}`);
                                }
                            }
                        } else {
                            claimFarmSuccess = true;
                        }

                        if (claimFarmSuccess) {
                            try {
                                await this.startFarm(userId);
                                this.log(`${'Start Farm successfully!'.green}`);
                            } catch (startError) {
                                this.log(`${'Error when Start Farm!'.red}`);
                            }
                        }

                        try {
                            const getTaskResponse = await this.getTask(userId);
                            const tasks = getTaskResponse.data;

                            const kiemtraTaskResponse = await this.kiemtraTask(userId);
                            const completedTasks = kiemtraTaskResponse.data.flatMap(taskGroup => taskGroup.ton_twa_tasks);

                            const completedTaskIds = new Set(completedTasks.map(task => task.id));

                            const pendingTasks = tasks.flatMap(taskGroup => taskGroup.ton_twa_tasks)
                                .filter(task => 
                                    task.reward > 0 && 
                                    !completedTaskIds.has(task.id) &&
                                    !['telegramAuth', 'pumpersToken', 'pumpersTrade'].includes(task.handler)
                                );

                            for (const task of pendingTasks) {
                                const result = await this.claimTask(userId, task.id);
                                this.log(`${'Doing the mission'.yellow} ${task.title.white}... ${'Status:'.white} ${'Complete'.green}`);
                            }
                        } catch (taskError) {
                            this.log(`${'Error when processing tasks'.red}`);
                            console.log(taskError);
                        }

                        try {
                            const referralDataResponse = await this.getReferralData(userId);
                            const referralData = referralDataResponse.data;
                            if (referralData && referralData.claimAvailable > 0) {
                                if (referralData.nextReferralsClaimAt) {
                                    const nextReferralsClaimLocal = DateTime.fromISO(referralData.nextReferralsClaimAt, { zone: 'utc' });
                                    this.log(`${'Next Referrals Claim Time:'.green} ${this.formatToUTCPlus7(nextReferralsClaimLocal)}`);
                                    
                                    const now = DateTime.local().setZone('Asia/Jakarta');
                                    if (now > nextReferralsClaimLocal) {
                                        const claimResponse = await this.claimReferral(userId);
                                        if (claimResponse.data.result) {
                                            this.log(`${'Claim Referrals successfully!'.green}`);
                                        } else {
                                            this.log(`${'Claim Referrals failed!'.red}`);
                                        }
                                    }
                                } else {
                                    this.log(`${'Next Referrals Claim Time: NULL. Performing Claim...'.green}`);
                                    const claimResponse = await this.claimReferral(userId);
                                    if (claimResponse.data.result) {
                                        this.log(`${'Claim Referrals successfully!'.green}`);
                                    } else {
                                        this.log(`${'Claim Referrals failed!'.red}`);
                                    }
                                }
                            } else {
                                this.log(`${'No available Claim Referrals'.yellow}`);
                            }
                        } catch (error) {
                            this.log(`${'Error when processing referrals'.red}`);
                            console.log(error);
                        }
                        
                    } else {
                        this.log(`${'Error: No user ID found'.red}`);
                    }
                } catch (error) {
                    this.log(`${'Error when processing accounts'.red}`);
                    console.log(error);
                }
            }

            let waitTime;
            if (firstFarmCompleteTime) {
                const now = DateTime.local().setZone('Asia/Jakarta');
                const diff = firstFarmCompleteTime.diff(now, 'seconds').seconds;
                waitTime = Math.max(0, diff);
            } else {
                waitTime = 15 * 60; 
            }
            await this.waitWithCountdown(Math.floor(waitTime));
        }
    }    
}

if (require.main === module) {
    const dancay = new Nomis();
    dancay.main().catch(err => {
        console.error(err.red);
        process.exit(1);
    });
}
