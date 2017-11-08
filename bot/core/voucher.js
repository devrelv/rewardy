'use strict';

function Voucher(voucherId, title, emailTitle, store, description, imageUrl, points, cta) {
    this.voucherId = voucherId;
    this.title = title;
    this.emailTitle = emailTitle;
    this.store = store;
    this.description = description;
    this.imageUrl = imageUrl;
    this.points = points;
    this.cta = cta;
    
    Object.freeze(this);
}

module.exports = Voucher;
