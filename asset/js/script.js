const app = {
    url: '',
    slug: '',
    email: '',
    alert: null,
    loading: false,

    isValidated() {
        return !/^(https?):\/\/.{3,}/.test(this.url);
    },

    submit($refs, $nextTick) {
        if (!this.url) {
            this.alert = { type: 'error', message: '缺少必需的URL参数' };
            return;
        }

        if (this.isValidated()) {
            this.alert = { type: 'error', message: 'URL 格式不合规范' };
            return;
        }

        this.alert = null
        this.loading = true

        const body = {
            url: this.url
        }

        if (this.slug) {
            body.slug = this.slug
        }

        if (this.email) {
            body.email = this.email
        }

        fetch('/create', {
            method: 'post',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body)
        })

            .then(res => res.json())

            .then(res => {
                this.loading = false

                if (res.message) {
                    this.alert = { type: 'error', message: res.message }
                    return
                }

                this.url = res.link

                $nextTick(() => {
                    $refs.url.select()
                    this.alert = { type: 'success', message: `完成，请复制下方的链接` }
                })
            })

            .catch(e => {
                this.alert = { type: 'error', message: e.message }
                this.loading = false
            })
    }
}