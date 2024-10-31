const { DateTime } = require("luxon");

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AuthorSchema = new Schema({
    first_name: { type: String, required: true, maxLength: 100},
    family_name: {type: String, required: true, maxLength: 100},
    date_of_birth: { type: Date },
    date_of_death: { type: Date }
});

AuthorSchema.virtual("name").get( function () {
    // To avoid errors in cases where an author does not have either a family name or first name
    // We want to make sure we handle the exception by returning an empty string for that case
    let fullname = "";
    if (this.first_name && this.family_name) {
        fullname = `${this.family_name}, ${this.first_name}`;
    }

    return fullname;
})

// Virtual for author's birth & death dates
AuthorSchema.virtual("lifespan").get( function () {
    let lifespan = "";
    if (this.date_of_birth) {
        lifespan += "Born: ";
        lifespan += DateTime.fromJSDate(this.date_of_birth).setLocale("en-gb").toLocaleString(DateTime.DATE_MED);
    }
    if (this.date_of_death) {
        lifespan += " - Died: ";
        lifespan += DateTime.fromJSDate(this.date_of_death).setLocale("en-gb").toLocaleString(DateTime.DATE_MED);
    }

    return lifespan;
});

AuthorSchema.virtual("url").get( function(){
    // We don't use an arrow function as we'll need the this object
    return `/catalog/author/${this._id}`;
})

// Export model
module.exports = mongoose.model("Author", AuthorSchema);