/**
 * Sample inputs for the Samples menu. Lightning strings come from the
 * BOLT test vectors in test/fixtures (see PROVENANCE.md); the LNURL and
 * lightning address point at a live ZEUS Pay address.
 */
export interface Sample {
    group: string;
    label: string;
    value: string;
}

export const SAMPLES: Sample[] = [
    {
        group: 'BOLT 11',
        label: 'Amountless donation invoice',
        value: 'lnbc1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq9qrsgq357wnc5r2ueh7ck6q93dj32dlqnls087fxdwk8qakdyafkq3yap9us6v52vjjsrvywa6rt52cm9r9zqt8r2t7mlcwspyetp5h2tztugp9lfyql'
    },
    {
        group: 'BOLT 11',
        label: '2500u coffee, one-minute expiry',
        value: 'lnbc2500u1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpu9qrsgquk0rl77nj30yxdy8j9vdx85fkpmdla2087ne0xh8nhedh8w27kyke0lp53ut353s06fv3qfegext0eh0ymjpf39tuven09sam30g4vgpfna3rh'
    },
    {
        group: 'BOLT 11',
        label: 'Fallback address and route hints',
        value: 'lnbc20m1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqhp58yjmdan79s6qqdhdzgynm4zwqd5d7xmw5fk98klysy043l2ahrqsfpp3qjmp7lwpagxun9pygexvgpjdc4jdj85fr9yq20q82gphp2nflc7jtzrcazrra7wwgzxqc8u7754cdlpfrmccae92qgzqvzq2ps8pqqqqqqpqqqqq9qqqvpeuqafqxu92d8lr6fvg0r5gv0heeeqgcrqlnm6jhphu9y00rrhy4grqszsvpcgpy9qqqqqqgqqqqq7qqzq9qrsgqdfjcdk6w3ak5pca9hwfwfh63zrrz06wwfya0ydlzpgzxkn5xagsqz7x9j4jwe7yj7vaf2k9lqsdk45kts2fd0fkr28am0u4w95tt2nsq76cqw0'
    },
    {
        group: 'BOLT 11',
        label: 'Taproot fallback address',
        value: 'lnbc20m1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqhp58yjmdan79s6qqdhdzgynm4zwqd5d7xmw5fk98klysy043l2ahrqsfp4pptdvg0d2nj99568qn6ssdy4cygnwuxgw2ukmnwgwz7jpqjz2kszs9qrsgqy606dznq28exnydt2r4c29y56xjtn3sk4mhgjtl4pg2y4ar3249rq4ajlmj9jy8zvlzw7cr8mggqzm842xfr0v72rswzq9xvr4hknfsqwmn6xd'
    },
    {
        group: 'BOLT 11',
        label: 'Pico-BTC amount, one-week expiry',
        value: 'lnbc9678785340p1pwmna7lpp5gc3xfm08u9qy06djf8dfflhugl6p7lgza6dsjxq454gxhj9t7a0sd8dgfkx7cmtwd68yetpd5s9xar0wfjn5gpc8qhrsdfq24f5ggrxdaezqsnvda3kkum5wfjkzmfqf3jkgem9wgsyuctwdus9xgrcyqcjcgpzgfskx6eqf9hzqnteypzxz7fzypfhg6trddjhygrcyqezcgpzfysywmm5ypxxjemgw3hxjmn8yptk7untd9hxwg3q2d6xjcmtv4ezq7pqxgsxzmnyyqcjqmt0wfjjq6t5v4khxsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygsxqyjw5qcqp2rzjq0gxwkzc8w6323m55m4jyxcjwmy7stt9hwkwe2qxmy8zpsgg7jcuwz87fcqqeuqqqyqqqqlgqqqqn3qq9q9qrsgqrvgkpnmps664wgkp43l22qsgdw4ve24aca4nymnxddlnp8vh9v2sdxlu5ywdxefsfvm0fq3sesf08uf6q9a2ke0hc9j6z6wlxg5z5kqpu2v9wz'
    },
    {
        group: 'BOLT 11',
        label: 'Payment metadata',
        value: 'lnbc10m1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdp9wpshjmt9de6zqmt9w3skgct5vysxjmnnd9jx2mq8q8a04uqsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygs9q2gqqqqqqsgq7hf8he7ecf7n4ffphs6awl9t6676rrclv9ckg3d3ncn7fct63p6s365duk5wrk202cfy3aj5xnnp5gs3vrdvruverwwq7yzhkf5a3xqpd05wjc'
    },
    {
        group: 'BOLT 12',
        label: 'Minimal offer',
        value: 'lno1zcss9mk8y3wkklfvevcrszlmu23kfrxh49px20665dqwmn4p72pksese'
    },
    {
        group: 'BOLT 12',
        label: 'Offer with an amount',
        value: 'lno1pqpzwyq2p32x2um5ypmx2cm5dae8x93pqthvwfzadd7jejes8q9lhc4rvjxd022zv5l44g6qah82ru5rdpnpj'
    },
    {
        group: 'BOLT 12',
        label: 'Offer priced in USD',
        value: 'lno1qcp4256ypqpzwyq2p32x2um5ypmx2cm5dae8x93pqthvwfzadd7jejes8q9lhc4rvjxd022zv5l44g6qah82ru5rdpnpj'
    },
    {
        group: 'BOLT 12',
        label: 'Offer with two blinded paths',
        value: 'lno1pgx9getnwss8vetrw3hhyucsl5qj5qeyv5l2cs6y3qqzesrth7mlzrlp3xg7xhulusczm04x6g6nms9trspqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqqsqqqqqqqqqqqqqqqqqqqqqqqqqqpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqsqpqg3zyg3zyg3zygpqqqqzqqqqgqqxqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqqgqqqqqqqqqqqqqqqqqqqqqqqqqqqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgqqsg3zyg3zyg3zygtzzqhwcuj966ma9n9nqwqtl032xeyv6755yeflt235pmww58egx6rxry'
    },
    {
        group: 'BOLT 12',
        label: 'Offer split with + joins',
        value: 'lno1pqps7sjqpgt+ yzm3qv4uxzmtsd3jjqer9wd3hy6tsw3+  5k7msjzfpy7nz5yqcn+\nygrfdej82um5wf5k2uckyypwa3eyt44h6txtxquqh7lz5djge4afgfjn7k4rgrkuag0jsd+\r\n 5xvxg'
    },
    {
        group: 'BOLT 12',
        label: 'Signed invoice request',
        value: 'lnr1qqyqqqqqqqqqqqqqqcp4256ypqqkgzshgysy6ct5dpjk6ct5d93kzmpq23ex2ct5d9ek293pqthvwfzadd7jejes8q9lhc4rvjxd022zv5l44g6qah82ru5rdpnpjkppqvjx204vgdzgsqpvcp4mldl3plscny0rt707gvpdh6ndydfacz43euzqhrurageg3n7kafgsek6gz3e9w52parv8gs2hlxzk95tzeswywffxlkeyhml0hh46kndmwf4m6xma3tkq2lu04qz3slje2rfthc89vss'
    },
    {
        group: 'BOLT 12',
        label: 'Signed invoice',
        value: 'lni1qqgqqqqqqqqqqqqqqqqqqqqqqqqqq93pqf9u9gcjv52n7pl8pc96kzrjfe4ctcshlrxk9r8tv2t5y3amfyecy5szq059sggry3jnatzrgjyqqtxqdwlm0ug0uxyerc6lnljrqtd75mfr20wq4vw2qasz0uc7h32x9s0aecdhxlk075kn046aafpuuyw8f5j652t3vha2yqrsxtqt0nu4xf9q05znnzeyq96dcrptu3zdj6c4n2nv0aa3ue5xszv3qypwm2aaz66peqm3hyh09uzvzxzmfupmdhx49w5m0rva0jyu3u3pz3gqzqqqqqqqqqqqqqqqqqqqqqqqqqq2y8qqqqqqzqqqqqpqqqcqqqqqqqqqqqzqqqqqqqqqqqq9qqq2gpr82fuc32pqwtxkappzcsrlkmgfs6g0zyct0hkhashh7hsaxz7e65slq9fkx7f65qsrazhq6zqqqqqqqqqqqqqqqqqqqzczzqjtc233yeg48ur7wrst4vy8ynntsh3p07xdv2xwkc5hgfrmkjfnstcyp7aextn2n4d5mzx2phwfe70cejyqaaq78my4wndgna3ymwyc4vlf60kke258g33nhp23vldqpygemxp54ecl0vr0qfejm3xpm6atq4mlavkstcqszss'
    },
    {
        group: 'BOLT 12',
        label: 'Payer proof (draft)',
        value: 'lnp1tqssxfr986kyx3ygqqkvq6alklcslcvfj834l8lyxqkmafkjx57up2cu4qs89ntwss3vgplmd5ycdy83zv9hmmt7ctmltcwnp0va2g0sz5mr0yasyypyhs4rzfj320c8uu8qh2cgwf8xhp0zzluv6c5vad3fwsj8hdyn8qhsgq9rxgj9dzm24ehdy5sp90tluyrjcqltmjnl538etvplrngfhc5tp2punsepqktcekqd5p5f09nzeq86qrlj2rxdcngckuyll5w84cce79qva0p96s9zmynmt672hpqq74p0hdag733w3hvq9wcnupgtn0ef8d690svmg6j8vaq0jlyadmq5ru35xnzaf7398gwjawyfd6adn9z4en7s86fqqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyql6ql2qcqsyk26tw5l6qlt5zlcev436mafhnw2k5qmt8uzcew9q6mlgdg5wdlhr9l3lnl2awk5rw2qdaxw2f4x5r2wpvax8mvf4qewx89ejwwluxnmthtjxtfjcq4tekwyfdfmx9cqe8ksuveseep97lccltp0c82kdg6ydppeya8suvtflxps7tpswr8m45flmccwudkdw9p4jytya5fqgz5u6k2uj6zq4jve32ml48r587uahkcd34r0hcadxv6qp0g87v5dekmqppushjwjm07s8mrq7t027heshc7wmz0u0sjdgg5pn0cx4u8y3gc5ywaapcnrfu7rmenlqxgux5qqy364fwxs5xtgnznef0eaazvcy4c30rvnrtlmv48scxn7j2mhh83cgdjs7mxha62tvaf7480n2vm3pvzdae5x45mk29d9ev'
    },
    {
        group: 'LNURL',
        label: 'LNURL-pay for zeus@zeuspay.com',
        value: 'LNURL1DP68GURN8GHJ77N9W4EHQCTE9E3K7MF09EMK2MRV944KUMMHDCHKCMN4WFK8QTM6V46HXMPT5LW'
    },
    {
        group: 'LNURL',
        label: 'Lightning address',
        value: 'zeus@zeuspay.com'
    }
];
